# WebTransport QUIC Patterns Skill

## When to Use
Implementing MIDI 2.0 UMP (Universal MIDI Packet) transport over WebTransport/QUIC for ultra-low-latency DAW integration.

## Core Architecture

### QUIC Server with TLS
```rust
// sensorium-midi/src/server.rs
use quinn::{Endpoint, ServerConfig, TransportConfig};
use rustls::{Certificate, PrivateKey};
use std::sync::Arc;

pub struct MidiQuicServer {
    endpoint: Endpoint,
    config: Arc<ServerConfig>,
}

impl MidiQuicServer {
    pub async fn new(addr: &str) -> Result<Self> {
        let (cert, key) = generate_self_signed_cert()?;
        
        let mut transport_config = TransportConfig::default();
        transport_config.max_idle_timeout(Some(Duration::from_secs(30).try_into().unwrap()));
        transport_config.keep_alive_interval(Some(Duration::from_secs(10)));
        
        let mut server_config = ServerConfig::with_single_cert(vec![cert], key)?;
        server_config.transport_config(Arc::new(transport_config));
        
        let endpoint = Endpoint::server(server_config.clone(), addr.parse()?)?;
        
        Ok(Self {
            endpoint,
            config: Arc::new(server_config),
        })
    }
    
    pub async fn run(&self) -> Result<()> {
        while let Some(conn) = self.endpoint.accept().await {
            tokio::spawn(handle_connection(conn.await?));
        }
        Ok(())
    }
}

async fn handle_connection(conn: quinn::Connection) -> Result<()> {
    loop {
        let stream = conn.accept_bi().await?;
        tokio::spawn(handle_bidirectional_stream(stream));
    }
}
```

### WebTransport Upgrade Handler
```rust
// sensorium-midi/src/webtransport.rs
use webtransport::{ServerConfig as WTConfig, Session};

pub async fn handle_webtransport_upgrade(req: http::Request<()>) -> Result<Response<()>> {
    // Validate WebTransport upgrade request
    if !req.headers().contains_key("sec-webtransport-http3-draft") {
        return Err("Not a WebTransport request".into());
    }
    
    // Accept upgrade
    let session = Session::accept(req).await?;
    
    // Handle bidirectional streams for MIDI
    tokio::spawn(handle_webtransport_session(session));
    
    Ok(Response::new(()))
}

async fn handle_webtransport_session(session: Session) -> Result<()> {
    // Open MIDI data stream
    let (mut send, mut recv) = session.open_bi().await?;
    
    // Open SysEx stream (lower priority)
    let (mut sysex_send, mut sysex_recv) = session.open_bi().await?;
    
    // Stream multiplexing: prioritize MIDI data
    tokio::select! {
        _ = handle_midi_stream(&mut send, &mut recv) => {},
        _ = handle_sysex_stream(&mut sysex_send, &mut sysex_recv) => {},
        _ = session.closed() => {},
    }
    Ok(())
}
```

### MIDI 2.0 UMP Parser
```rust
// sensorium-midi/src/ump.rs
use midly::{MidiMessage, live::LiveEvent};

#[derive(Debug, Clone)]
pub enum UmpMessage {
    // 32-bit: Channel Voice Messages
    ChannelVoice { 
        group: u4, 
        status: u4, 
        channel: u4, 
        data1: u8, 
        data2: u8 
    },
    // 64-bit: Channel Voice with 32-bit data
    ChannelVoice32 { 
        group: u4, 
        status: u4, 
        channel: u4, 
        data: u32 
    },
    // 96-bit: Per-Note Controllers
    PerNoteController { 
        group: u4, 
        note: u8, 
        controller: u8, 
        data: u32 
    },
    // 128-bit: System Exclusive / Mixed Data Set
    SysEx { 
        group: u4, 
        data: Vec<u8> 
    },
}

impl UmpMessage {
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < 4 { return Err("UMP too short".into()); }
        
        let mt = (data[0] >> 4) & 0xF;  // Message Type
        let group = data[0] & 0xF;
        
        match mt {
            0x1 => { // Channel Voice 32-bit
                ensure!(data.len() >= 4);
                Ok(UmpMessage::ChannelVoice {
                    group,
                    status: (data[1] >> 4) & 0xF,
                    channel: data[1] & 0xF,
                    data1: data[2],
                    data2: data[3],
                })
            }
            0x2 => { // Channel Voice 64-bit
                ensure!(data.len() >= 8);
                let data = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
                Ok(UmpMessage::ChannelVoice32 { group, status: ..., channel: ..., data })
            }
            0x3 => { // Per-Note Controller
                ensure!(data.len() >= 8);
                Ok(UmpMessage::PerNoteController {
                    group,
                    note: data[2],
                    controller: data[3],
                    data: u32::from_be_bytes([data[4], data[5], data[6], data[7]]),
                })
            }
            0x4..=0x7 => { // SysEx / Mixed Data
                // Variable length - parse accordingly
                Ok(UmpMessage::SysEx { group, data: data[4..].to_vec() })
            }
            _ => Err("Unknown UMP type".into()),
        }
    }
    
    pub fn serialize(&self) -> Vec<u8> {
        // Serialize back to UMP wire format
        match self {
            UmpMessage::ChannelVoice { group, status, channel, data1, data2 } => {
                vec![
                    (0x1 << 4) | group,
                    (status << 4) | channel,
                    *data1,
                    *data2,
                ]
            }
            // ... other variants
        }
    }
}
```

### 0-RTT Reconnect Logic
```rust
pub struct SessionManager {
    tickets: Arc<RwLock<HashMap<String, Vec<u8>>>>,
}

impl SessionManager {
    pub fn store_ticket(&self, session_id: String, ticket: Vec<u8>) {
        self.tickets.write().insert(session_id, ticket);
    }
    
    pub fn get_ticket(&self, session_id: &str) -> Option<Vec<u8>> {
        self.tickets.read().get(session_id).cloned()
    }
    
    pub async fn reconnect_0rtt(&self, session_id: &str, addr: &str) -> Result<Connection> {
        let ticket = self.get_ticket(session_id)
            .ok_or("No 0-RTT ticket available")?;
        
        let mut client_config = ClientConfig::default();
        client_config.enable_0rtt();
        
        let endpoint = Endpoint::client("0.0.0.0:0".parse()?)?;
        endpoint.set_default_client_config(client_config);
        
        let conn = endpoint.connect_with(addr.parse()?, "sensorium.ai")?
            .with_0rtt(ticket)
            .await?;
        
        Ok(conn)
    }
}
```

### Stream Multiplexing & Backpressure
```rust
pub struct StreamMultiplexer {
    midi_tx: mpsc::Sender<UmpMessage>,
    sysex_tx: mpsc::Sender<Vec<u8>>,
    metadata_tx: mpsc::Sender<MetadataMessage>,
}

impl StreamMultiplexer {
    pub fn new() -> (Self, StreamDemultiplexer) {
        let (midi_tx, midi_rx) = mpsc::channel(1024);
        let (sysex_tx, sysex_rx) = mpsc::channel(256);
        let (metadata_tx, metadata_rx) = mpsc::channel(64);
        
        let mux = Self { midi_tx, sysex_tx, metadata_tx };
        let demux = StreamDemultiplexer { midi_rx, sysex_rx, metadata_rx };
        (mux, demux)
    }
    
    pub async fn send_midi(&self, msg: UmpMessage) -> Result<()> {
        self.midi_tx.send(msg).await.map_err(|_| "MIDI channel full".into())
    }
    
    // Backpressure: if channel full, drop lowest priority (SysEx first)
    pub async fn send_with_backpressure(&self, msg: PriorityMessage) -> Result<()> {
        match msg.priority {
            Priority::High => self.midi_tx.send(msg.data).await,
            Priority::Low => self.sysex_tx.try_send(msg.data)
                .or_else(|_| self.metadata_tx.try_send(msg.data)),
        }
    }
}
```

## Verification Gates

### Gate M1: Connection Latency
```bash
# Benchmark QUIC handshake + 0-RTT
cargo bench --package sensorium-midi -- quic_handshake
# Target: < 50ms initial, < 10ms 0-RTT
```

### Gate M2: MIDI Throughput
```bash
# 10k UMP messages/sec sustained
cargo bench --package sensorium-midi -- midi_throughput
```

### Gate M3: Reconnect Resilience
```bash
# Chaos test: network partition + reconnect
cargo test --package sensorium-midi -- reconnect_resilience
```

## Contract-First MIDI (Protobuf)
```protobuf
// specs/midi-2.0.proto
message UMPMessage {
  uint32 ump_type = 1;
  int64 timestamp = 2;
  bytes payload = 3;
}

message PerNoteExpression {
  uint32 note_number = 1;
  float timbre = 2;
  float pressure = 3;
  float pitch_bend = 4;
  float brightness = 5;
}

message DeviceProfile {
  string vendor = 1;
  string model = 2;
  repeated Capability capabilities = 3;
}

enum Capability {
  MPE = 0;
  PER_NOTE_PITCH = 1;
  PER_NOTE_EXPRESSION = 2;
  SYSEX_8 = 3;
}
```

## Common Fixes

### Stub Replacement (from `bail!` to real impl)
```rust
// BEFORE (stub)
async fn handle_webtransport_session(_session: Session) -> Result<()> {
    bail!("WebTransport handler not implemented")
}

// AFTER (real implementation)
async fn handle_webtransport_session(session: Session) -> Result<()> {
    let (send, recv) = session.open_bi().await?;
    // Real MIDI stream handling
    tokio::spawn(handle_midi_stream(send, recv));
    Ok(())
}
```

### Certificate Management
```rust
fn generate_self_signed_cert() -> Result<(Certificate, PrivateKey)> {
    // Use rcgen for dev certificates
    let cert = rcgen::generate_simple_self_signed(vec!["sensorium.ai".into()])?;
    Ok((
        Certificate(cert.serialize_der()?),
        PrivateKey(cert.serialize_private_key_der()),
    ))
}
```

## Verification Report Template
```
WEBTRANSPORT/QUIC VERIFICATION REPORT
=====================================
QUIC Server Start:    [PASS/FAIL] (port X)
0-RTT Handshake:      [PASS/FAIL] (X ms)
WebTransport Upgrade: [PASS/FAIL]
UMP Parser:           [PASS/FAIL] (32/64/96/128-bit)
Stream Multiplexing:  [PASS/FAIL] (MIDI/SysEx/Metadata)
Reconnect Resilience: [PASS/FAIL] (MTTR: X ms)
Backpressure Handling:[PASS/FAIL]
Overall:              [READY/NOT READY]
```