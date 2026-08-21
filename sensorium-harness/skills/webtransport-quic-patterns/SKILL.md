---
name: webtransport-quic-patterns
description: Use when implementing MIDI 2.0 UMP over WebTransport/QUIC with 0-RTT, multiplexing, stream priorities, and browser fallback
---

# WebTransport/QUIC Patterns

## Overview
WebTransport (HTTP/3 over QUIC) provides 0-RTT connection establishment, multiplexed bidirectional streams, and browser-native support. Ideal for MIDI 2.0 UMP (Universal MIDI Packets) with 256 channels, per-note expression, and sub-10µs latency requirements.

## When to Use
- Real-time MIDI 2.0 over network (DAW ↔ controller ↔ plugin)
- Need 0-RTT reconnection for live performance
- Multiplexed streams: MIDI, audio metadata, state sync, control
- Browser clients (WebTransport API) + Rust servers (quinn)
- Fallback to WebSocket when QUIC unavailable

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
quinn = "0.11"                # QUIC implementation
webtransport = "0.12"         # WebTransport server
rustls = "0.23"               # TLS 1.3
tokio = { version = "1.38", features = ["full", "rt-multi-thread"] }
bytes = "1.5"                 # Zero-copy buffers
```

### MIDI 2.0 UMP Message Structure
```rust
use bytes::{Bytes, BytesMut, Buf, BufMut};

/// Universal MIDI Packet (UMP) 1.1 - 32-bit words
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct UmpPacket {
    pub message_type: u8,     // 4 bits: UMP format
    pub group: u8,            // 4 bits: 0-15 (16 groups = 256 channels)
    pub status: u8,           // 8 bits: Note On/Off, CC, Per-Note, etc.
    pub data1: u8,            // 8 bits
    pub data2: u8,            // 8 bits
    // For 64/96/128-bit packets: additional words follow
}

impl UmpPacket {
    pub fn to_bytes(&self) -> [u8; 4] {
        [
            (self.message_type << 4) | self.group,
            self.status,
            self.data1,
            self.data2,
        ]
    }
    
    pub fn from_bytes(bytes: &[u8; 4]) -> Self {
        Self {
            message_type: bytes[0] >> 4,
            group: bytes[0] & 0x0F,
            status: bytes[1],
            data1: bytes[2],
            data2: bytes[3],
        }
    }
}

/// Per-Note Expression (MIDI 2.0)
#[derive(Debug, Clone)]
pub struct PerNoteExpression {
    pub note: u8,
    pub attribute: u8,        // Pitch, Timbre, Pressure, etc.
    pub value: u32,           // 32-bit resolution
}
```

### QUIC Server (Rust)
```rust
use quinn::{Endpoint, ServerConfig, TransportConfig};
use rustls::ServerConfig as TlsConfig;
use std::sync::Arc;
use tokio::sync::mpsc;

async fn run_midi_server(
    addr: std::net::SocketAddr,
    tls_config: TlsConfig,
    midi_tx: mpsc::Sender<UmpPacket>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut transport_config = TransportConfig::default();
    transport_config.max_idle_timeout(Some(
        std::time::Duration::from_secs(30).try_into()?
    ));
    transport_config.keep_alive_interval(Some(std::time::Duration::from_secs(10)));
    
    let mut server_config = ServerConfig::with_crypto(Arc::new(tls_config));
    server_config.transport_config(Arc::new(transport_config));
    
    let endpoint = Endpoint::server(server_config, addr)?;
    
    println!("MIDI 2.0 WebTransport server listening on {}", addr);
    
    while let Some(conn) = endpoint.accept().await {
        let midi_tx = midi_tx.clone();
        tokio::spawn(async move {
            handle_connection(conn.await?, midi_tx).await
        });
    }
    Ok(())
}

async fn handle_connection(
    connection: quinn::Connection,
    midi_tx: mpsc::Sender<UmpPacket>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Accept bidirectional streams
    loop {
        let (send, recv) = connection.accept_bi().await?;
        tokio::spawn(handle_bidi_stream(send, recv, midi_tx.clone()));
    }
}

async fn handle_bidi_stream(
    mut send: quinn::SendStream,
    mut recv: quinn::RecvStream,
    midi_tx: mpsc::Sender<UmpPacket>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Read UMP packets from stream
    let mut buf = [0u8; 4];
    while recv.read_exact(&mut buf).await.is_ok() {
        let packet = UmpPacket::from_bytes(&buf);
        
        // Route to MIDI engine (non-blocking)
        if midi_tx.try_send(packet).is_err() {
            // Backpressure: drop oldest or signal congestion
            break;
        }
        
        // Echo/ack if needed
        send.write_all(&buf).await?;
    }
    Ok(())
}
```

### 0-RTT Reconnection
```rust
// Client-side: store session ticket for 0-RTT
let endpoint = Endpoint::client("[::]:0".parse()?)?;
endpoint.set_default_client_config(client_config);

let connection = endpoint
    .connect_with(server_addr, "sensorium.dev")?
    .await?;

// Enable 0-RTT on subsequent connections
let session_ticket = connection.save_session_ticket();
// Store ticket securely for next launch

// Next launch: use ticket for 0-RTT
let connection = endpoint
    .connect_with_0rtt(server_addr, "sensorium.dev", ticket)?
    .await?;
```

### Stream Prioritization (MIDI > State Sync > Analytics)
```rust
// Configure stream priorities via QUIC
let mut transport_config = TransportConfig::default();
// Stream 0: MIDI (highest priority, lowest latency)
transport_config.stream_receive_window(65536);
// Stream 1: State sync (medium)
// Stream 2: Analytics (lowest, can be dropped)

/// WebTransport stream mapping
enum StreamType {
    Midi = 0,           // Bidirectional, 0-RTT eligible
    StateSync = 1,      // Unidirectional server->client
    Control = 2,        // Bidirectional, reliable
    Analytics = 3,      // Unidirectional client->server, droppable
}
```

### Browser Client (TypeScript)
```typescript
// npm: webtransport@0.12, @types/webtransport@0.12

class MidiWebTransport {
    private transport: WebTransport;
    private midiEncoder: UmpEncoder;
    private streams: Map<number, WebTransportBidirectionalStream> = new Map();
    
    async connect(url: string) {
        this.transport = new WebTransport(url);
        
        // Wait for connection (supports 0-RTT automatically)
        await this.transport.ready;
        console.log('WebTransport connected, 0-RTT:', this.transport.datagrams?.type);
        
        // Open MIDI stream (priority 0)
        const midiStream = await this.transport.createBidirectionalStream();
        this.streams.set(0, midiStream);
        this.readMidiLoop(midiStream);
    }
    
    private async readMidiLoop(stream: WebTransportBidirectionalStream) {
        const reader = stream.readable.getReader();
        const buffer = new Uint8Array(4);
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer.set(value);
            const packet = UmpPacket.fromBytes(buffer);
            this.onMidiPacket(packet);
        }
    }
    
    sendMidi(packet: UmpPacket) {
        const stream = this.streams.get(0);
        if (stream?.writable) {
            const writer = stream.writable.getWriter();
            writer.write(packet.toBytes());
            writer.releaseLock();
        }
    }
    
    // Fallback to WebSocket if WebTransport fails
    async connectWithFallback(urls: string[]) {
        for (const url of urls) {
            try {
                await this.connect(url);
                return;
            } catch (e) {
                console.warn(`Failed ${url}:`, e);
            }
        }
        // Final fallback: WebSocket
        this.connectWebSocket(urls[0].replace('https://', 'wss://'));
    }
}
```

### QUIC Connection Migration (Mobile/Roaming)
```rust
// QUIC supports connection migration via Connection ID
// Client can change IP (WiFi → Cellular) without reconnection

let mut transport_config = TransportConfig::default();
transport_config.enable_migration(true);
// Server must also support migration

// On mobile: seamless handoff during performance
```

## Verification Commands
```bash
# Build server
cargo build --release --package sensorium-midi-server

# Run integration tests
cargo test --package sensorium-midi -- webtransport_integration

# Benchmark: 0-RTT reconnect latency
cargo bench --package sensorium-midi -- bench_0rtt_reconnect

# Load test: 1000 concurrent streams
cargo test --package sensorium-midi -- load_test -- --nocapture
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| No TLS 1.3 cert | Generate self-signed for dev: `rcgen` or `mkcert` |
| Blocking in stream handler | Use `try_send`, bounded channels, spawn tasks |
| Ignoring backpressure | Monitor `send_stream.capacity()`, apply congestion control |
| Single stream for everything | Multiplex: MIDI (stream 0), State (1), Control (2) |
| No WebSocket fallback | Implement progressive enhancement |

## Real-World Impact
- 0-RTT: <50ms reconnection (stage-ready)
- Multiplexing: 1 connection for MIDI + State + Control
- Browser-native: no WebSocket overhead
- QUIC: congestion control, migration, stream priorities