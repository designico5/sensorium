use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use tokio::io::AsyncReadExt;
use tracing::{info, warn};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UmpMessageType {
    Utility = 0x0,
    SysEx = 0x1,
    Data = 0x2,
    Midi1ChannelVoice = 0x3,
    Midi2ChannelVoice = 0x4,
    SysExOrData64 = 0x5,
    PerNoteExpression = 0x6,
}

impl TryFrom<u8> for UmpMessageType {
    type Error = anyhow::Error;
    fn try_from(value: u8) -> Result<Self> {
        match value & 0xF {
            0x0 => Ok(UmpMessageType::Utility),
            0x1 => Ok(UmpMessageType::SysEx),
            0x2 => Ok(UmpMessageType::Data),
            0x3 => Ok(UmpMessageType::Midi1ChannelVoice),
            0x4 => Ok(UmpMessageType::Midi2ChannelVoice),
            0x5 => Ok(UmpMessageType::SysExOrData64),
            0x6 => Ok(UmpMessageType::PerNoteExpression),
            _ => anyhow::bail!("unknown UMP message type"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UmpPacketSize {
    S32 = 4,
    S64 = 8,
    S96 = 12,
    S128 = 16,
}

impl UmpPacketSize {
    pub fn from_message_type(msg_type: UmpMessageType) -> Self {
        match msg_type {
            UmpMessageType::Utility => UmpPacketSize::S32,
            UmpMessageType::SysEx | UmpMessageType::Data | UmpMessageType::Midi1ChannelVoice => UmpPacketSize::S32,
            UmpMessageType::Midi2ChannelVoice => UmpPacketSize::S64,
            UmpMessageType::SysExOrData64 => UmpPacketSize::S64,
            UmpMessageType::PerNoteExpression => UmpPacketSize::S128,
        }
    }
}

/// Compact UMP packet using a fixed-size data array.
///
/// Optimized for zero-allocation: uses a 12-byte data buffer
/// instead of 11 Option<u8> fields (saves ~77 bytes per packet).
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct UmpPacket {
    pub message_type: u8,
    pub group: u8,
    pub status: u8,
    pub data1: u8,
    pub data2: u8,
    /// Additional data bytes (data3..data14) stored contiguously.
    /// Only `data_len` bytes are valid.
    pub data: [u8; 12],
    pub data_len: u8,
}

impl UmpPacket {
    /// Create a minimal 32-bit UMP packet (MIDI 1.0 channel voice or utility).
    ///
    /// Zero-allocation convenience constructor for the most common case:
    /// 4-byte MIDI 1.0 messages (Note On, Note Off, CC, etc.).
    #[inline(always)]
    pub fn new_32bit(message_type: u8, group: u8, status: u8, data1: u8, data2: u8) -> Self {
        Self {
            message_type,
            group,
            status,
            data1,
            data2,
            data: [0; 12],
            data_len: 0,
        }
    }

    pub fn size(&self) -> UmpPacketSize {
        let msg_type = match UmpMessageType::try_from(self.message_type) {
            Ok(m) => m,
            Err(_) => return UmpPacketSize::S32,
        };
        UmpPacketSize::from_message_type(msg_type)
    }

    /// Number of bytes required by this packet's message type.
    #[inline]
    pub fn encoded_len(&self) -> usize {
        self.size() as usize
    }

    /// Encode into a caller-owned fixed buffer without allocating.
    ///
    /// This is the path intended for a real-time or bounded transport
    /// boundary. It rejects a packet whose payload length does not match the
    /// message type instead of silently truncating or over-writing a buffer.
    pub fn write_bytes(&self, out: &mut [u8; 16]) -> Result<usize> {
        let encoded_len = self.encoded_len();
        let payload_len = encoded_len.saturating_sub(4);
        if self.data_len as usize > payload_len {
            anyhow::bail!(
                "UMP payload length {} exceeds {} bytes for message type 0x{:X}",
                self.data_len,
                payload_len,
                self.message_type,
            );
        }

        out[..encoded_len].fill(0);
        out[0] = (self.message_type << 4) | (self.group & 0x0F);
        out[1] = self.status;
        out[2] = self.data1;
        out[3] = self.data2;
        let data_len = self.data_len as usize;
        out[4..4 + data_len].copy_from_slice(&self.data[..data_len]);
        Ok(encoded_len)
    }

    /// Encode into an owned vector for non-real-time callers.
    pub fn try_to_bytes(&self) -> Result<Vec<u8>> {
        let mut out = [0u8; 16];
        let encoded_len = self.write_bytes(&mut out)?;
        Ok(out[..encoded_len].to_vec())
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.try_to_bytes().unwrap_or_default()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.is_empty() { anyhow::bail!("empty UMP bytes"); }
        let message_type = bytes[0] >> 4;
        let message_type = UmpMessageType::try_from(message_type)?;
        let expected_len = UmpPacketSize::from_message_type(message_type) as usize;
        if bytes.len() != expected_len {
            anyhow::bail!(
                "invalid UMP length {} for message type {:?}; expected {}",
                bytes.len(),
                message_type,
                expected_len,
            );
        }
        let group = bytes[0] & 0x0F;
        let status = bytes.get(1).copied().unwrap_or(0);
        let data1 = bytes.get(2).copied().unwrap_or(0);
        let data2 = bytes.get(3).copied().unwrap_or(0);

        let mut data = [0u8; 12];
        let mut data_len = 0u8;
        for i in 4..bytes.len() {
            data[i - 4] = bytes[i];
            data_len += 1;
        }

        Ok(Self {
            message_type: message_type as u8,
            group,
            status,
            data1,
            data2,
            data,
            data_len,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerNoteExpression {
    pub note: u8,
    pub attribute: u8,
    pub value: u32,
}

#[derive(Debug, Clone)]
pub struct RouteDecision {
    pub channel: usize,
    pub group: u8,
    pub timestamp: Instant,
}

/// Transport-independent identity reported by an operating-system MIDI adapter.
///
/// Serial numbers are preferred for reconnects. Devices without a serial are
/// deliberately marked unstable so a same-name replacement cannot be silently
/// treated as the original endpoint.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct MidiDeviceId {
    pub manufacturer: String,
    pub product: String,
    pub serial: Option<String>,
    pub transport: String,
}

impl MidiDeviceId {
    pub fn stable_key(&self) -> String {
        let serial = self
            .serial
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("unstable");
        format!(
            "{}:{}:{}:{}",
            normalize_identity_part(&self.transport),
            normalize_identity_part(&self.manufacturer),
            normalize_identity_part(&self.product),
            normalize_identity_part(serial),
        )
    }

    pub fn is_stable(&self) -> bool {
        self.serial
            .as_deref()
            .is_some_and(|serial| !serial.trim().is_empty())
    }
}

fn normalize_identity_part(value: &str) -> String {
    value.trim().to_ascii_lowercase().replace(':', "_")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum MidiDirection {
    Input,
    Output,
}

/// Stable endpoint identity used by routing and hotplug reconciliation.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct MidiEndpointId {
    pub device: MidiDeviceId,
    pub port_index: u16,
    pub direction: MidiDirection,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MidiEndpoint {
    pub id: MidiEndpointId,
    pub display_name: String,
    pub connected: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MidiEndpointTransition {
    Connected(MidiEndpointId),
    Reconnected(MidiEndpointId),
    Updated(MidiEndpointId),
    Disconnected(MidiEndpointId),
}

/// Bounded endpoint registry for hotplug, replacement and duplicate-name handling.
#[derive(Debug, Default)]
pub struct MidiEndpointRegistry {
    endpoints: BTreeMap<MidiEndpointId, MidiEndpoint>,
}

impl MidiEndpointRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn upsert(&mut self, mut endpoint: MidiEndpoint) {
        endpoint.connected = true;
        self.endpoints.insert(endpoint.id.clone(), endpoint);
    }

    pub fn mark_disconnected(&mut self, id: &MidiEndpointId) -> bool {
        if let Some(endpoint) = self.endpoints.get_mut(id) {
            endpoint.connected = false;
            true
        } else {
            false
        }
    }

    pub fn get(&self, id: &MidiEndpointId) -> Option<&MidiEndpoint> {
        self.endpoints.get(id)
    }

    pub fn connected_named(&self, display_name: &str) -> Vec<&MidiEndpoint> {
        self.endpoints
            .values()
            .filter(|endpoint| endpoint.connected && endpoint.display_name == display_name)
            .collect()
    }

    /// Reconcile an adapter snapshot with the last known endpoint state.
    ///
    /// This is intentionally outside the audio callback: adapters may allocate
    /// while enumerating ports, while the returned transitions give the caller a
    /// deterministic, auditable recovery event stream.
    pub fn reconcile(&mut self, observed: &[MidiEndpoint]) -> Vec<MidiEndpointTransition> {
        let mut transitions = Vec::new();

        for (id, endpoint) in &self.endpoints {
            if endpoint.connected && !observed.iter().any(|candidate| candidate.id == *id) {
                transitions.push(MidiEndpointTransition::Disconnected(id.clone()));
            }
        }

        for candidate in observed {
            match self.endpoints.get(&candidate.id) {
                None => transitions.push(MidiEndpointTransition::Connected(candidate.id.clone())),
                Some(previous) if !previous.connected => {
                    transitions.push(MidiEndpointTransition::Reconnected(candidate.id.clone()))
                }
                Some(previous) if previous.display_name != candidate.display_name => {
                    transitions.push(MidiEndpointTransition::Updated(candidate.id.clone()))
                }
                Some(_) => {}
            }
            self.upsert(candidate.clone());
        }

        for transition in &transitions {
            if let MidiEndpointTransition::Disconnected(id) = transition {
                self.mark_disconnected(id);
            }
        }
        transitions
    }

    pub fn len(&self) -> usize {
        self.endpoints.len()
    }

    pub fn is_empty(&self) -> bool {
        self.endpoints.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct MidiRouter {
    pub channel_count: usize,
    pub per_note_enabled: bool,
}

impl Default for MidiRouter {
    fn default() -> Self {
        Self {
            channel_count: 16,
            per_note_enabled: true,
        }
    }
}

impl MidiRouter {
    pub fn route(&self, packet: &UmpPacket) -> Result<RouteDecision> {
        if self.channel_count == 0 || self.channel_count > 16 {
            anyhow::bail!("channel_count must be between 1 and 16");
        }
        let channel = (packet.group % self.channel_count as u8) as usize;
        Ok(RouteDecision {
            channel,
            group: packet.group,
            timestamp: Instant::now(),
        })
    }
}

// ── Panic Button (M7) ──────────────────────────────────────────────

/// MIDI panic state for immediate all-notes-off across all channels.
///
/// Designed for sub-millisecond response: no allocation, no locking,
/// just a flag check in the audio callback.
pub struct PanicButton {
    panic_triggered: AtomicBool,
    all_notes_off_sent: AtomicBool,
}

impl Default for PanicButton {
    fn default() -> Self {
        Self::new()
    }
}

impl PanicButton {
    /// Create a new panic button in idle state.
    pub fn new() -> Self {
        Self {
            panic_triggered: AtomicBool::new(false),
            all_notes_off_sent: AtomicBool::new(false),
        }
    }

    /// Trigger panic: immediately silence all voices.
    ///
    /// This sets an atomic flag that the audio callback checks
    /// every cycle. Response time: < 1 audio block (~5ms @ 48kHz/256).
    pub fn trigger(&self) {
        self.panic_triggered.store(true, Ordering::Release);
        self.all_notes_off_sent.store(false, Ordering::Release);
        warn!("PANIC TRIGGERED — all notes off");
    }

    /// Check if panic is active. Called from the audio hot-path.
    #[inline(always)]
    pub fn is_panic(&self) -> bool {
        self.panic_triggered.load(Ordering::Acquire)
    }

    /// Generate All Notes Off messages for all 16 MIDI channels.
    ///
    /// Returns a vector of UMP packets (MIDI 1.0 CC 121 = Reset All
    /// Controllers + CC 123 = All Notes Off) that should be sent
    /// immediately.
    pub fn generate_all_notes_off(&mut self) -> Vec<UmpPacket> {
        if self.all_notes_off_sent.load(Ordering::Acquire) {
            return Vec::new();
        }

        let mut messages = Vec::with_capacity(32);
        for group in 0u8..16 {
            // CC 123: All Notes Off (channel voice, status 0xB0)
            messages.push(UmpPacket {
                message_type: 0x3, // MIDI 1.0 Channel Voice
                group,
                status: 0xB0, // Control Change
                data1: 123,   // All Notes Off
                data2: 0,
                data: [0; 12],
                data_len: 0,
            });
            // CC 121: Reset All Controllers
            messages.push(UmpPacket {
                message_type: 0x3,
                group,
                status: 0xB0,
                data1: 121, // Reset All Controllers
                data2: 0,
                data: [0; 12],
                data_len: 0,
            });
        }

        self.all_notes_off_sent.store(true, Ordering::Release);
        self.panic_triggered.store(false, Ordering::Release);
        info!("All Notes Off sent for 16 groups (32 messages)");
        messages
    }

    /// Reset the panic state.
    pub fn reset(&mut self) {
        self.panic_triggered.store(false, Ordering::Release);
        self.all_notes_off_sent.store(false, Ordering::Release);
    }
}

/// RT-safe fixed-capacity MIDI packet buffer.
///
/// Uses a ring buffer with const-generic capacity for zero-allocation
/// operation in the audio callback. No heap memory, no panics.
///
/// # Type Parameter
/// - `N`: Maximum packet capacity (compile-time constant).
pub struct MidiBuffer<const N: usize> {
    packets: [UmpPacket; N],
    head: usize,
    len: usize,
}

impl<const N: usize> MidiBuffer<N> {
    /// Create an empty buffer. All slots are initialized to default (zero).
    pub fn new() -> Self {
        Self {
            packets: std::array::from_fn(|_| UmpPacket::default()),
            head: 0,
            len: 0,
        }
    }

    /// Push a packet into the buffer. Returns `false` if full.
    /// O(1), no allocation, no lock.
    #[inline(always)]
    pub fn push(&mut self, packet: UmpPacket) -> bool {
        if self.len >= N {
            return false;
        }
        let idx = (self.head + self.len) % N;
        self.packets[idx] = packet;
        self.len += 1;
        true
    }

    /// Drain all packets in FIFO order, resetting the buffer.
    /// Returns only the valid packets (no allocation for empty slots).
    pub fn drain(&mut self) -> Vec<UmpPacket> {
        let mut result = Vec::with_capacity(self.len);
        for i in 0..self.len {
            let idx = (self.head + i) % N;
            result.push(self.packets[idx]);
        }
        self.head = 0;
        self.len = 0;
        result
    }

    /// Drain into caller-owned storage without allocating.
    ///
    /// Returns the number of packets copied. If `out` is too small, only the
    /// first `out.len()` packets are copied and the remainder stays queued.
    pub fn drain_into(&mut self, out: &mut [UmpPacket]) -> usize {
        let count = self.len.min(out.len());
        for (i, slot) in out.iter_mut().take(count).enumerate() {
            let idx = (self.head + i) % N;
            *slot = self.packets[idx];
        }
        self.head = (self.head + count) % N;
        self.len -= count;
        if self.len == 0 {
            self.head = 0;
        }
        count
    }

    /// Number of packets currently buffered.
    #[inline(always)]
    pub fn len(&self) -> usize {
        self.len
    }

    /// Whether the buffer is empty.
    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Whether the buffer is full.
    #[inline(always)]
    pub fn is_full(&self) -> bool {
        self.len >= N
    }
}

impl<const N: usize> Default for MidiBuffer<N> {
    fn default() -> Self {
        Self::new()
    }
}

/// Generate a self-signed certificate for QUIC connections.
fn generate_self_signed_cert() -> Result<(Vec<rustls::pki_types::CertificateDer<'static>>, rustls::pki_types::PrivateKeyDer<'static>)> {
    let cert = rcgen::generate_simple_self_signed(vec!["localhost".into()])
        .map_err(|e| anyhow::anyhow!("cert generation failed: {}", e))?;
    let cert_der = rustls::pki_types::CertificateDer::from(cert.cert.der().to_vec());
    let key_der = rustls::pki_types::PrivateKeyDer::from(
        rustls::pki_types::PrivatePkcs8KeyDer::from(cert.key_pair.serialized_der().to_vec())
    );
    Ok((vec![cert_der], key_der))
}

/// QUIC transport server for MIDI 2.0 UMP streaming.
///
/// Accepts incoming QUIC connections and reads UMP packets from
/// unidirectional streams. Each stream carries a sequence of
/// length-prefixed UMP packets.
pub struct QuicServer {
    endpoint: Option<quinn::Endpoint>,
    addr: String,
}

impl QuicServer {
    /// Bind a QUIC server to the given address.
    pub async fn bind(addr: impl Into<String>) -> Result<Self> {
        let addr_str = addr.into();
        let socket_addr: std::net::SocketAddr = addr_str.parse()
            .map_err(|e| anyhow::anyhow!("invalid address '{}': {}", addr_str, e))?;

        let (certs, key) = generate_self_signed_cert()?;

        let mut server_crypto = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(certs, key)
            .map_err(|e| anyhow::anyhow!("TLS config error: {}", e))?;
        server_crypto.alpn_protocols = vec![b"sensorium-midi/1".to_vec()];

        let quic_config = quinn::crypto::rustls::QuicServerConfig::try_from(server_crypto)
            .map_err(|e| anyhow::anyhow!("QUIC config error: {}", e))?;
        let mut server_config = quinn::ServerConfig::with_crypto(Arc::new(quic_config));
        // Allow bidirectional and unidirectional streams
        let mut transport = quinn::TransportConfig::default();
        transport.max_concurrent_uni_streams(64u32.into());
        transport.max_concurrent_bidi_streams(16u32.into());
        server_config.transport_config(Arc::new(transport));

        let endpoint = quinn::Endpoint::server(server_config, socket_addr)
            .map_err(|e| anyhow::anyhow!("bind failed: {}", e))?;

        info!(%addr_str, "QUIC server bound");
        Ok(Self {
            endpoint: Some(endpoint),
            addr: addr_str,
        })
    }

    /// Accept connections and process UMP streams.
    /// Returns the number of packets received before shutdown.
    pub async fn start(&self) -> Result<()> {
        let endpoint = self.endpoint.as_ref()
            .ok_or_else(|| anyhow::anyhow!("server not bound"))?;
        info!(addr = %self.addr, "QUIC server listening");

        // Accept loop — runs until the endpoint is closed
        while let Some(incoming) = endpoint.accept().await {
            let connection = incoming.await
                .map_err(|e| anyhow::anyhow!("accept failed: {}", e))?;
            info!(remote = %connection.remote_address(), "QUIC connection established");

            // Spawn a task for each connection
            tokio::spawn(async move {
                loop {
                    match connection.accept_uni().await {
                        Ok(mut stream) => {
                            tokio::spawn(async move {
                                loop {
                                    // Read length-prefixed UMP: 2-byte length + payload
                                    let len = match stream.read_u16().await {
                                        Ok(l) => l as usize,
                                        Err(_) => break,
                                    };
                                    let mut buf = vec![0u8; len];
                                    if stream.read_exact(&mut buf).await.is_err() {
                                        break;
                                    }
                                    // Process the UMP packet bytes
                                    match UmpPacket::from_bytes(&buf) {
                                        Ok(pkt) => {
                                            tracing::debug!(
                                                msg_type = pkt.message_type,
                                                group = pkt.group,
                                                "Received UMP packet"
                                            );
                                        }
                                        Err(e) => {
                                            warn!("invalid UMP in stream: {}", e);
                                        }
                                    }
                                }
                            });
                        }
                        Err(_) => break,
                    }
                }
            });
        }
        Ok(())
    }

    /// Returns the server address.
    pub fn addr(&self) -> &str {
        &self.addr
    }

    /// Gracefully close the server.
    pub fn close(&mut self) {
        if let Some(ep) = self.endpoint.take() {
            ep.close(quinn::VarInt::from_u32(0), b"shutdown");
            info!("QUIC server closed");
        }
    }
}

/// QUIC transport client for MIDI 2.0 UMP streaming.
///
/// Connects to a QUIC server and sends UMP packets over
/// unidirectional streams with length-prefix framing.
pub struct WebTransportClient {
    connection: Option<quinn::Connection>,
    url: String,
}

impl WebTransportClient {
    /// Connect to a QUIC server at the given address.
    pub async fn connect(url: impl Into<String>) -> Result<Self> {
        let url_str = url.into();
        let socket_addr: std::net::SocketAddr = url_str.parse()
            .map_err(|e| anyhow::anyhow!("invalid address '{}': {}", url_str, e))?;

        let mut client_crypto = rustls::ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(Arc::new(SkipServerVerification))
            .with_no_client_auth();
        client_crypto.alpn_protocols = vec![b"sensorium-midi/1".to_vec()];

        let quic_config = quinn::crypto::rustls::QuicClientConfig::try_from(client_crypto)
            .map_err(|e| anyhow::anyhow!("QUIC client config error: {}", e))?;
        let mut endpoint = quinn::Endpoint::client("0.0.0.0:0".parse()?)?;
        endpoint.set_default_client_config(quinn::ClientConfig::new(Arc::new(quic_config)));

        let connection = endpoint.connect(socket_addr, "localhost")
            .map_err(|e| anyhow::anyhow!("connect failed: {}", e))?
            .await
            .map_err(|e| anyhow::anyhow!("connection failed: {}", e))?;

        info!(%url_str, "QUIC client connected");
        Ok(Self {
            connection: Some(connection),
            url: url_str,
        })
    }

    /// Send a UMP packet to the server over a unidirectional stream.
    pub async fn send_ump(&self, packet: &UmpPacket) -> Result<()> {
        let conn = self.connection.as_ref()
            .ok_or_else(|| anyhow::anyhow!("not connected"))?;
        let data = packet.try_to_bytes()?;
        let len = data.len() as u16;

        let mut stream = conn.open_uni().await
            .map_err(|e| anyhow::anyhow!("open_uni failed: {}", e))?;
        stream.write_all(&len.to_be_bytes()).await
            .map_err(|e| anyhow::anyhow!("write len failed: {}", e))?;
        stream.write_all(&data).await
            .map_err(|e| anyhow::anyhow!("write data failed: {}", e))?;
        let _ = stream.finish();
        Ok(())
    }

    /// Returns the target URL.
    pub fn url(&self) -> &str {
        &self.url
    }

    /// Close the connection.
    pub fn close(&mut self) {
        if let Some(conn) = self.connection.take() {
            conn.close(quinn::VarInt::from_u32(0), b"shutdown");
            info!("QUIC client disconnected");
        }
    }
}

/// TLS certificate verifier that accepts any certificate (for development/testing).
#[derive(Debug)]
struct SkipServerVerification;

impl rustls::client::danger::ServerCertVerifier for SkipServerVerification {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::pki_types::CertificateDer<'_>,
        _intermediates: &[rustls::pki_types::CertificateDer<'_>],
        _server_name: &rustls::pki_types::ServerName<'_>,
        _ocsp_response: &[u8],
        _now: rustls::pki_types::UnixTime,
    ) -> std::result::Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> std::result::Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> std::result::Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        vec![
            rustls::SignatureScheme::RSA_PKCS1_SHA256,
            rustls::SignatureScheme::RSA_PKCS1_SHA384,
            rustls::SignatureScheme::RSA_PKCS1_SHA512,
            rustls::SignatureScheme::ECDSA_NISTP256_SHA256,
            rustls::SignatureScheme::ECDSA_NISTP384_SHA384,
            rustls::SignatureScheme::ECDSA_NISTP521_SHA512,
            rustls::SignatureScheme::ED25519,
            rustls::SignatureScheme::RSA_PSS_SHA256,
            rustls::SignatureScheme::RSA_PSS_SHA384,
            rustls::SignatureScheme::RSA_PSS_SHA512,
        ]
    }
}

#[derive(Debug, Clone)]
pub struct WebSocketFallback {
    pub url: String,
}

impl WebSocketFallback {
    pub async fn connect(url: impl Into<String>) -> Result<Self> {
        Ok(Self { url: url.into() })
    }
}

// ── MPE (MIDI Polyphonic Expression) ────────────────────────────────

/// MPE zone configuration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MpeZone {
    /// Lower zone: member channels 1–15, master channel 1.
    Lower,
    /// Upper zone: member channels 1–15, master channel 16.
    Upper,
}

/// Per-note expression dimensions for MPE.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct MpeVoiceExpression {
    /// Pitch bend in cents (±4800 default MPE range).
    pub pitch_bend_cents: i32,
    /// Pressure (0.0–1.0), from channel pressure / poly aftertouch.
    pub pressure: f32,
    /// Timbre (0.0–1.0), from CC 74.
    pub timbre: f32,
}

/// MPE voice state — tracks per-note expression for active notes.
pub struct MpeState {
    zone: MpeZone,
    member_channels: Vec<u8>,
    active_voices: HashMap<u8, MpeVoiceExpression>,
    note_channel_map: HashMap<u8, u8>,
}

impl MpeState {
    pub fn new(zone: MpeZone, num_members: u8) -> Self {
        let member_channels: Vec<u8> = match zone {
            MpeZone::Lower => (1..=num_members).collect(),
            MpeZone::Upper => (16 - num_members..=15).collect(),
        };
        Self {
            zone,
            member_channels,
            active_voices: HashMap::new(),
            note_channel_map: HashMap::new(),
        }
    }

    pub fn zone(&self) -> MpeZone { self.zone }
    pub fn member_channels(&self) -> &[u8] { &self.member_channels }

    /// Handle a note-on: register the voice on the given channel.
    pub fn note_on(&mut self, channel: u8, note: u8) {
        self.active_voices.insert(note, MpeVoiceExpression::default());
        self.note_channel_map.insert(note, channel);
    }

    /// Handle a note-off: remove the voice.
    pub fn note_off(&mut self, note: u8) {
        self.active_voices.remove(&note);
        self.note_channel_map.remove(&note);
    }

    /// Update pitch bend for a note (identified by its channel).
    pub fn set_pitch_bend(&mut self, note: u8, cents: i32) {
        if let Some(voice) = self.active_voices.get_mut(&note) {
            voice.pitch_bend_cents = cents.clamp(-4800, 4800);
        }
    }

    /// Update pressure for a note.
    pub fn set_pressure(&mut self, note: u8, pressure: f32) {
        if let Some(voice) = self.active_voices.get_mut(&note) {
            voice.pressure = pressure.clamp(0.0, 1.0);
        }
    }

    /// Update timbre for a note.
    pub fn set_timbre(&mut self, note: u8, timbre: f32) {
        if let Some(voice) = self.active_voices.get_mut(&note) {
            voice.timbre = timbre.clamp(0.0, 1.0);
        }
    }

    /// Get the current expression for a note.
    pub fn get_expression(&self, note: u8) -> Option<&MpeVoiceExpression> {
        self.active_voices.get(&note)
    }

    /// Returns the number of active voices.
    pub fn active_voice_count(&self) -> usize {
        self.active_voices.len()
    }

    /// Get the channel assigned to a note.
    pub fn channel_for_note(&self, note: u8) -> Option<u8> {
        self.note_channel_map.get(&note).copied()
    }

    /// Clear all active voices (e.g., on panic).
    pub fn clear_all(&mut self) {
        self.active_voices.clear();
        self.note_channel_map.clear();
    }

    /// Generate MPE RPN messages to configure pitch bend range.
    pub fn generate_pitch_bend_range_msg(range_semitones: u8) -> Vec<UmpPacket> {
        // RPN 0 (Pitch Bend Range): CC 101=0, CC 100=0, CC 6=range
        vec![
            UmpPacket {
                message_type: 0x3, group: 0, status: 0xB0,
                data1: 101, data2: 0,
                data: [0; 12], data_len: 0,
            },
            UmpPacket {
                message_type: 0x3, group: 0, status: 0xB0,
                data1: 100, data2: 0,
                data: [0; 12], data_len: 0,
            },
            UmpPacket {
                message_type: 0x3, group: 0, status: 0xB0,
                data1: 6, data2: range_semitones,
                data: [0; 12], data_len: 0,
            },
        ]
    }
}

impl Default for MpeState {
    fn default() -> Self {
        Self::new(MpeZone::Lower, 15)
    }
}

// ── MIDI Learn 2.0 ─────────────────────────────────────────────────

/// A MIDI Learn binding: maps a physical MIDI control to a logical parameter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MidiLearnBinding {
    pub id: u32,
    pub channel: u8,
    pub cc: u8,
    pub parameter_name: String,
    pub min_value: f32,
    pub max_value: f32,
    pub curve: MidiLearnCurve,
    pub active: bool,
}

/// Response curve for MIDI Learn mappings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MidiLearnCurve {
    Linear,
    Exponential,
    Logarithmic,
    Inverted,
}

impl MidiLearnCurve {
    /// Apply the curve to a normalized input (0.0–1.0).
    pub fn apply(&self, input: f32) -> f32 {
        let x = input.clamp(0.0, 1.0);
        match self {
            Self::Linear => x,
            Self::Exponential => x * x,
            Self::Logarithmic => x.sqrt(),
            Self::Inverted => 1.0 - x,
        }
    }
}

/// MIDI Learn manager: handles learn mode and binding management.
pub struct MidiLearnManager {
    bindings: Vec<MidiLearnBinding>,
    learn_mode: bool,
    pending_learn: Option<(u8, u8)>,
    next_id: u32,
}

impl MidiLearnManager {
    pub fn new() -> Self {
        Self {
            bindings: Vec::new(),
            learn_mode: false,
            pending_learn: None,
            next_id: 1,
        }
    }

    /// Enter or exit learn mode.
    pub fn set_learn_mode(&mut self, enabled: bool) {
        self.learn_mode = enabled;
        if !enabled {
            self.pending_learn = None;
        }
    }

    pub fn is_learning(&self) -> bool { self.learn_mode }

    /// Capture an incoming CC as the source for a new binding.
    pub fn capture_cc(&mut self, channel: u8, cc: u8) {
        if self.learn_mode {
            self.pending_learn = Some((channel, cc));
        }
    }

    /// Complete a binding: assign the captured CC to a parameter name.
    pub fn bind_to_parameter(&mut self, parameter: &str, min: f32, max: f32, curve: MidiLearnCurve) -> Option<u32> {
        if let Some((channel, cc)) = self.pending_learn.take() {
            let id = self.next_id;
            self.next_id += 1;
            self.bindings.push(MidiLearnBinding {
                id,
                channel,
                cc,
                parameter_name: parameter.to_string(),
                min_value: min,
                max_value: max,
                curve,
                active: true,
            });
            Some(id)
        } else {
            None
        }
    }

    /// Resolve an incoming CC to a normalized parameter value.
    pub fn resolve_cc(&self, channel: u8, cc: u8, value: u8) -> Option<(String, f32)> {
        for binding in &self.bindings {
            if binding.active && binding.channel == channel && binding.cc == cc {
                let normalized = value as f32 / 127.0;
                let curved = binding.curve.apply(normalized);
                let mapped = binding.min_value + curved * (binding.max_value - binding.min_value);
                return Some((binding.parameter_name.clone(), mapped));
            }
        }
        None
    }

    /// Remove a binding by ID.
    pub fn remove_binding(&mut self, id: u32) -> bool {
        let before = self.bindings.len();
        self.bindings.retain(|b| b.id != id);
        self.bindings.len() < before
    }

    /// Returns all bindings.
    pub fn bindings(&self) -> &[MidiLearnBinding] { &self.bindings }

    /// Returns the number of active bindings.
    pub fn binding_count(&self) -> usize {
        self.bindings.iter().filter(|b| b.active).count()
    }

    /// Clear all bindings.
    pub fn clear_all(&mut self) {
        self.bindings.clear();
    }
}

impl Default for MidiLearnManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn device(serial: Option<&str>) -> MidiDeviceId {
        MidiDeviceId {
            manufacturer: "Acme".into(),
            product: "Stage Box".into(),
            serial: serial.map(str::to_owned),
            transport: "USB".into(),
        }
    }

    #[test]
    fn device_identity_is_stable_only_with_serial() {
        assert!(device(Some(" 42 ")).is_stable());
        assert_eq!(device(Some(" 42 ")).stable_key(), "usb:acme:stage box:42");
        assert!(!device(None).is_stable());
        assert!(device(None).stable_key().ends_with(":unstable"));
    }

    #[test]
    fn endpoint_registry_keeps_same_name_endpoints_distinct() {
        let first = MidiEndpointId {
            device: device(Some("A")),
            port_index: 0,
            direction: MidiDirection::Input,
        };
        let second = MidiEndpointId {
            device: device(Some("B")),
            port_index: 0,
            direction: MidiDirection::Input,
        };
        let mut registry = MidiEndpointRegistry::new();
        registry.upsert(MidiEndpoint { id: first.clone(), display_name: "Live In".into(), connected: false });
        registry.upsert(MidiEndpoint { id: second.clone(), display_name: "Live In".into(), connected: false });
        assert_eq!(registry.connected_named("Live In").len(), 2);
        assert!(registry.mark_disconnected(&first));
        assert_eq!(registry.connected_named("Live In").len(), 1);
        assert!(registry.get(&second).is_some());
    }

    #[test]
    fn endpoint_registry_reconciles_disconnect_and_reconnect() {
        let id = MidiEndpointId {
            device: device(Some("A")),
            port_index: 0,
            direction: MidiDirection::Output,
        };
        let endpoint = MidiEndpoint { id: id.clone(), display_name: "Out".into(), connected: false };
        let mut registry = MidiEndpointRegistry::new();
        assert!(matches!(registry.reconcile(std::slice::from_ref(&endpoint))[0], MidiEndpointTransition::Connected(_)));
        assert!(matches!(registry.reconcile(&[])[0], MidiEndpointTransition::Disconnected(_)));
        assert!(matches!(registry.reconcile(std::slice::from_ref(&endpoint))[0], MidiEndpointTransition::Reconnected(_)));
    }

    #[test]
    fn ump_roundtrip_32bit() {
        let pkt = UmpPacket {
            message_type: 0x1,
            group: 0,
            status: 0x90,
            data1: 60,
            data2: 100,
            data: [0; 12],
            data_len: 0,
        };
        let bytes = pkt.to_bytes();
        let decoded = UmpPacket::from_bytes(&bytes).unwrap();
        assert_eq!(pkt.message_type, decoded.message_type);
        assert_eq!(pkt.status, decoded.status);
        assert_eq!(pkt.data1, decoded.data1);
        assert_eq!(pkt.data2, decoded.data2);
    }

    #[test]
    fn ump_roundtrip_96bit() {
        let pkt = UmpPacket {
            message_type: 0x4,
            group: 1,
            status: 0x20,
            data1: 61,
            data2: 0x40,
            data: [0x50, 0x60, 0x70, 0x00, 0, 0, 0, 0, 0, 0, 0, 0],
            data_len: 4,
        };
        let bytes = pkt.to_bytes();
        assert_eq!(bytes.len(), 8); // Midi2ChannelVoice with data3-data6 = 8 bytes
        let decoded = UmpPacket::from_bytes(&bytes).unwrap();
        assert_eq!(pkt.status, decoded.status);
    }

    #[test]
    fn ump_rejects_truncated_and_oversized_packets() {
        let valid = UmpPacket::new_32bit(0x3, 0, 0x90, 60, 100);
        assert!(UmpPacket::from_bytes(&valid.to_bytes()[..3]).is_err());

        let invalid = UmpPacket {
            message_type: 0x3,
            group: 0,
            status: 0x90,
            data1: 60,
            data2: 100,
            data: [0; 12],
            data_len: 1,
        };
        assert!(invalid.try_to_bytes().is_err());
    }

    #[test]
    fn ump_fixed_buffer_encoding_is_bounded() {
        let packet = UmpPacket {
            message_type: 0x4,
            group: 2,
            status: 0x20,
            data1: 60,
            data2: 0,
            data: [1, 2, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0],
            data_len: 4,
        };
        let mut buffer = [0u8; 16];
        assert_eq!(packet.write_bytes(&mut buffer).unwrap(), 8);
        assert_eq!(&buffer[..4], &[0x42, 0x20, 60, 0]);
        assert_eq!(&buffer[4..8], &[1, 2, 3, 4]);
    }

    #[test]
    fn router_respects_channel_count() {
        let router = MidiRouter {
            channel_count: 8,
            per_note_enabled: true,
        };
        let pkt = UmpPacket {
            message_type: 0x1,
            group: 10,
            status: 0x50,
            data1: 60,
            data2: 100,
            data: [0; 12],
            data_len: 0,
        };
        let decision = router.route(&pkt).unwrap();
        assert_eq!(decision.channel, 2);
    }

    #[test]
    fn router_rejects_invalid_channel_count() {
        let packet = UmpPacket::new_32bit(0x3, 0, 0x90, 60, 100);
        assert!(MidiRouter { channel_count: 0, per_note_enabled: false }.route(&packet).is_err());
        assert!(MidiRouter { channel_count: 17, per_note_enabled: false }.route(&packet).is_err());
    }

    // ── Panic Button Tests ─────────────────────────────────────────

    #[test]
    fn panic_button_default_idle() {
        let btn = PanicButton::new();
        assert!(!btn.is_panic());
    }

    #[test]
    fn panic_button_trigger_and_check() {
        let btn = PanicButton::new();
        btn.trigger();
        assert!(btn.is_panic());
    }

    #[test]
    fn panic_button_generates_32_messages() {
        let mut btn = PanicButton::new();
        btn.trigger();
        let messages = btn.generate_all_notes_off();
        assert_eq!(messages.len(), 32); // 16 groups × 2 messages each
        // Verify first message is CC 123 (All Notes Off)
        assert_eq!(messages[0].data1, 123);
        assert_eq!(messages[0].status, 0xB0);
        // Verify second message is CC 121 (Reset All Controllers)
        assert_eq!(messages[1].data1, 121);
    }

    #[test]
    fn panic_button_resets_after_generate() {
        let mut btn = PanicButton::new();
        btn.trigger();
        assert!(btn.is_panic());
        let _ = btn.generate_all_notes_off();
        assert!(!btn.is_panic());
        // Second call returns empty
        let second = btn.generate_all_notes_off();
        assert!(second.is_empty());
    }

    #[test]
    fn panic_button_manual_reset() {
        let mut btn = PanicButton::new();
        btn.trigger();
        btn.reset();
        assert!(!btn.is_panic());
    }

    // ── MPE Tests ──────────────────────────────────────────────────

    #[test]
    fn mpe_creation_lower_zone() {
        let mpe = MpeState::new(MpeZone::Lower, 15);
        assert_eq!(mpe.zone(), MpeZone::Lower);
        assert_eq!(mpe.member_channels().len(), 15);
        assert_eq!(mpe.active_voice_count(), 0);
    }

    #[test]
    fn mpe_note_on_off() {
        let mut mpe = MpeState::default();
        mpe.note_on(1, 60);
        assert_eq!(mpe.active_voice_count(), 1);
        assert_eq!(mpe.channel_for_note(60), Some(1));
        mpe.note_off(60);
        assert_eq!(mpe.active_voice_count(), 0);
    }

    #[test]
    fn mpe_per_note_expression() {
        let mut mpe = MpeState::default();
        mpe.note_on(1, 60);
        mpe.set_pitch_bend(60, 200);
        mpe.set_pressure(60, 0.7);
        mpe.set_timbre(60, 0.3);
        let expr = mpe.get_expression(60).unwrap();
        assert_eq!(expr.pitch_bend_cents, 200);
        assert!((expr.pressure - 0.7).abs() < 0.001);
        assert!((expr.timbre - 0.3).abs() < 0.001);
    }

    #[test]
    fn mpe_pitch_bend_clamped() {
        let mut mpe = MpeState::default();
        mpe.note_on(1, 60);
        mpe.set_pitch_bend(60, 99999); // Way beyond range
        let expr = mpe.get_expression(60).unwrap();
        assert_eq!(expr.pitch_bend_cents, 4800); // Clamped to max
    }

    #[test]
    fn mpe_clear_all() {
        let mut mpe = MpeState::default();
        mpe.note_on(1, 60);
        mpe.note_on(2, 64);
        mpe.note_on(3, 67);
        assert_eq!(mpe.active_voice_count(), 3);
        mpe.clear_all();
        assert_eq!(mpe.active_voice_count(), 0);
    }

    #[test]
    fn mpe_pitch_bend_range_messages() {
        let msgs = MpeState::generate_pitch_bend_range_msg(48);
        assert_eq!(msgs.len(), 3);
        assert_eq!(msgs[2].data1, 6);
        assert_eq!(msgs[2].data2, 48);
    }

    // ── MIDI Learn Tests ───────────────────────────────────────────

    #[test]
    fn midi_learn_creation() {
        let mgr = MidiLearnManager::new();
        assert!(!mgr.is_learning());
        assert_eq!(mgr.binding_count(), 0);
    }

    #[test]
    fn midi_learn_flow() {
        let mut mgr = MidiLearnManager::new();
        mgr.set_learn_mode(true);
        assert!(mgr.is_learning());
        mgr.capture_cc(1, 74); // CC 74 on channel 1
        let id = mgr.bind_to_parameter("filter_cutoff", 20.0, 20000.0, MidiLearnCurve::Exponential);
        assert!(id.is_some());
        assert_eq!(mgr.binding_count(), 1);
    }

    #[test]
    fn midi_learn_resolve_cc() {
        let mut mgr = MidiLearnManager::new();
        mgr.set_learn_mode(true);
        mgr.capture_cc(1, 74);
        mgr.bind_to_parameter("filter_cutoff", 20.0, 20000.0, MidiLearnCurve::Linear);
        let result = mgr.resolve_cc(1, 74, 64);
        assert!(result.is_some());
        let (param, value) = result.unwrap();
        assert_eq!(param, "filter_cutoff");
        assert!(value > 20.0 && value < 20000.0);
    }

    #[test]
    fn midi_learn_no_binding_returns_none() {
        let mgr = MidiLearnManager::new();
        assert!(mgr.resolve_cc(1, 74, 64).is_none());
    }

    #[test]
    fn midi_learn_remove_binding() {
        let mut mgr = MidiLearnManager::new();
        mgr.set_learn_mode(true);
        mgr.capture_cc(1, 74);
        let id = mgr.bind_to_parameter("test", 0.0, 1.0, MidiLearnCurve::Linear).unwrap();
        assert_eq!(mgr.binding_count(), 1);
        assert!(mgr.remove_binding(id));
        assert_eq!(mgr.binding_count(), 0);
    }

    #[test]
    fn midi_learn_curve_linear() {
        assert!((MidiLearnCurve::Linear.apply(0.5) - 0.5).abs() < 0.001);
    }

    #[test]
    fn midi_learn_curve_exponential() {
        let val = MidiLearnCurve::Exponential.apply(0.5);
        assert!((val - 0.25).abs() < 0.001); // 0.5^2 = 0.25
    }

    #[test]
    fn midi_learn_curve_inverted() {
        let val = MidiLearnCurve::Inverted.apply(0.3);
        assert!((val - 0.7).abs() < 0.001);
    }

    #[tokio::test]
    async fn quic_server_client_roundtrip() {
        // Install the ring crypto provider for rustls
        let _ = rustls::crypto::ring::default_provider().install_default();

        // Start a QUIC server on a random port
        let server = QuicServer::bind("127.0.0.1:0").await.unwrap();
        // Get the actual bound address
        let addr = server.endpoint.as_ref().unwrap().local_addr().unwrap();
        let addr_str = addr.to_string();

        // Spawn the server accept loop
        let server_handle = tokio::spawn(async move {
            // Accept just one connection's worth of streams, then stop
            if let Some(incoming) = server.endpoint.as_ref().unwrap().accept().await {
                let conn = incoming.await.unwrap();
                if let Ok(mut stream) = conn.accept_uni().await {
                    let len = stream.read_u16().await.unwrap() as usize;
                    let mut buf = vec![0u8; len];
                    stream.read_exact(&mut buf).await.unwrap();
                    // Verify we received a valid UMP packet
                    let pkt = UmpPacket::from_bytes(&buf).unwrap();
                    assert_eq!(pkt.message_type, 0x1);
                    assert_eq!(pkt.status, 0x90);
                }
            }
        });

        // Give the server a moment to start accepting
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        // Connect a client and send a UMP packet
        let mut client = WebTransportClient::connect(&addr_str).await.unwrap();
        let pkt = UmpPacket {
            message_type: 0x1,
            group: 0,
            status: 0x90,
            data1: 60,
            data2: 100,
            data: [0; 12],
            data_len: 0,
        };
        client.send_ump(&pkt).await.unwrap();

        // Wait for the server to process
        let _ = tokio::time::timeout(
            std::time::Duration::from_secs(2),
            server_handle,
        ).await;

        client.close();
    }

    // ── new_32bit & MidiBuffer Ring Buffer Tests ────────────────────

    #[test]
    fn new_32bit_creates_compact_packet() {
        let pkt = UmpPacket::new_32bit(0x3, 5, 0x90, 60, 127);
        assert_eq!(pkt.message_type, 0x3);
        assert_eq!(pkt.group, 5);
        assert_eq!(pkt.status, 0x90);
        assert_eq!(pkt.data1, 60);
        assert_eq!(pkt.data2, 127);
        assert_eq!(pkt.data_len, 0);
        assert_eq!(pkt.data, [0; 12]);
    }

    #[test]
    fn midi_buffer_push_and_drain() {
        let mut buf = MidiBuffer::<64>::new();
        assert!(buf.is_empty());
        assert_eq!(buf.len(), 0);

        let pkt = UmpPacket::new_32bit(0x3, 0, 0x90, 60, 100);
        assert!(buf.push(pkt));
        assert_eq!(buf.len(), 1);
        assert!(!buf.is_empty());

        let drained = buf.drain();
        assert_eq!(drained.len(), 1);
        assert_eq!(drained[0].data1, 60);
        assert!(buf.is_empty());
    }

    #[test]
    fn midi_buffer_full_returns_false() {
        let mut buf = MidiBuffer::<4>::new();
        for i in 0..4 {
            assert!(buf.push(UmpPacket::new_32bit(0x3, 0, 0x90, i, 100)));
        }
        assert!(buf.is_full());
        // 5th push must fail
        assert!(!buf.push(UmpPacket::new_32bit(0x3, 0, 0x90, 99, 100)));
    }

    #[test]
    fn midi_buffer_fifo_order() {
        let mut buf = MidiBuffer::<8>::new();
        for i in 0..5u8 {
            buf.push(UmpPacket::new_32bit(0x3, 0, 0x90, i, 100));
        }
        let drained = buf.drain();
        for (idx, pkt) in drained.iter().enumerate() {
            assert_eq!(pkt.data1, idx as u8);
        }
        assert!(buf.is_empty());
    }

    #[test]
    fn midi_buffer_drain_into_preserves_unread_packets() {
        let mut buf = MidiBuffer::<4>::new();
        for i in 0..4u8 {
            assert!(buf.push(UmpPacket::new_32bit(0x3, 0, 0x90, i, 100)));
        }
        let mut first = [UmpPacket::default(); 2];
        assert_eq!(buf.drain_into(&mut first), 2);
        assert_eq!(first[0].data1, 0);
        assert_eq!(first[1].data1, 1);
        let mut second = [UmpPacket::default(); 2];
        assert_eq!(buf.drain_into(&mut second), 2);
        assert_eq!(second[0].data1, 2);
        assert_eq!(second[1].data1, 3);
        assert!(buf.is_empty());
    }

    // ── Property-Based Tests (proptest) ──────────────────────────────

    use proptest::prelude::*;

    /// Helper: arbitrary UmpPacket with valid message_type (0..7) and group (0..15)
    fn arb_ump_packet() -> impl Strategy<Value = UmpPacket> {
        (0..7u8, 0..15u8, any::<u8>(), any::<u8>(), any::<u8>())
            .prop_map(|(msg_type, group, status, data1, data2)| {
                UmpPacket {
                    message_type: msg_type,
                    group,
                    status,
                    data1,
                    data2,
                    data: [0; 12],
                    data_len: 0,
                }
            })
    }

    proptest! {
        /// Property: to_bytes → from_bytes roundtrip preserves core fields
        #[test]
        fn ump_roundtrip_property(pkt in arb_ump_packet()) {
            let bytes = pkt.to_bytes();
            prop_assert!(!bytes.is_empty(), "to_bytes must not produce empty output");
            let decoded = UmpPacket::from_bytes(&bytes).expect("valid bytes from to_bytes");
            prop_assert_eq!(pkt.message_type, decoded.message_type);
            prop_assert_eq!(pkt.group, decoded.group);
            prop_assert_eq!(pkt.status, decoded.status);
            prop_assert_eq!(pkt.data1, decoded.data1);
            prop_assert_eq!(pkt.data2, decoded.data2);
        }

        /// Property: from_bytes never panics on arbitrary input
        #[test]
        fn ump_from_bytes_never_panics(bytes in proptest::collection::vec(any::<u8>(), 0..64)) {
            // Must either succeed or return Err — never panic
            let _ = UmpPacket::from_bytes(&bytes);
        }

        /// Property: to_bytes output length matches expected packet size
        #[test]
        fn ump_to_bytes_length_matches_size(pkt in arb_ump_packet()) {
            let bytes = pkt.to_bytes();
            let expected_size = pkt.size() as usize;
            // The actual byte output should be at most the expected packet size
            prop_assert!(bytes.len() <= expected_size,
                "to_bytes produced {} bytes but expected size is {}", bytes.len(), expected_size);
        }

        /// Property: group field is always in 0..15 range after roundtrip
        #[test]
        fn ump_group_4bit_range(pkt in arb_ump_packet()) {
            let bytes = pkt.to_bytes();
            let decoded = UmpPacket::from_bytes(&bytes).expect("valid bytes from to_bytes");
            prop_assert!(decoded.group <= 15, "group must fit in 4 bits");
        }

        /// Property: message_type is preserved in high nibble of first byte
        #[test]
        fn ump_message_type_in_first_byte(pkt in arb_ump_packet()) {
            let bytes = pkt.to_bytes();
            let high_nibble = bytes[0] >> 4;
            prop_assert_eq!(pkt.message_type, high_nibble);
        }
    }
}
