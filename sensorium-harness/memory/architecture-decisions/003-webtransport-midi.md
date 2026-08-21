# ADR-003: WebTransport MIDI 2.0

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need real-time MIDI 2.0 transport for:
- DAW ↔ Plugin ↔ Controller communication
- 256 channels (16 groups × 16 channels)
- Per-Note Expression (PNE) - 32-bit resolution per note
- Sub-10µs parse+route latency
- 0-RTT reconnection for live performance
- Browser support for web-based controllers

Previous: Custom OSC/UDP - no browser support, unreliable, no MIDI 2.0.

## Decision

Adopt **WebTransport (HTTP/3 over QUIC)** with **quinn 0.11** (Rust) + **WebTransport API** (browser) for MIDI 2.0 UMP 1.1 transport.

### Implementation Details

```toml
# Cargo.toml
quinn = "0.11"
webtransport = "0.12"
rustls = "0.23"
tokio = { version = "1.38", features = ["full"] }
bytes = "1.5"
```

### UMP 1.1 Packet Structure
```rust
// 32-bit base packet (most common)
struct Ump32 {
    mt: u4,      // Message type
    group: u4,   // 0-15 (256 channels)
    status: u8,  // Note On/Off, CC, PNE, etc.
    data1: u8,
    data2: u8,
}

// 64/96/128-bit for PNE, high-res CC, etc.
```

### Stream Multiplexing
| Stream | Purpose | Priority | Reliability |
|--------|---------|----------|-------------|
| 0 | MIDI 2.0 UMP (bidirectional) | Highest | Reliable |
| 1 | State Sync (server→client) | High | Reliable |
| 2 | Control/Config (bidirectional) | Medium | Reliable |
| 3 | Analytics (client→server) | Low | Unreliable |

### 0-RTT Reconnection
- Client stores session ticket after first connection
- Subsequent connections use ticket for 0-RTT
- Target: < 50ms reconnection (stage-ready)

## Consequences

### Positive
- 0-RTT: <50ms reconnection (critical for live)
- Multiplexing: 1 connection for MIDI + State + Control
- Browser-native: no WebSocket overhead, standard API
- QUIC: congestion control, migration, stream priorities
- TLS 1.3 mandatory: secure by default

### Negative
- QUIC blocked on some corporate networks (fallback needed)
- TLS cert required (self-signed for dev, proper for prod)
- WebTransport API not in all browsers (Safari limited)
- quinn API still evolving (pre-1.0)

### Neutral
- WebSocket fallback for compatibility
- UMP parser ~5µs per packet (well under 10µs budget)
- Session ticket storage: secure local file

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| WebSocket + binary | Universal | No 0-RTT, head-of-line blocking | Latency too high |
| Raw UDP + custom | Lowest latency | No browser, unreliable, NAT issues | Not browser-compatible |
| WebRTC DataChannel | Browser support | Complex, no 0-RTT, overhead | Overkill for MIDI |
| OSC over TCP | Simple | No browser, no MIDI 2.0, no multiplexing | Legacy protocol |

## References

- [WebTransport Spec](https://w3c.github.io/webtransport/)
- [QUIC RFC 9000](https://www.rfc-editor.org/rfc/rfc9000)
- [MIDI 2.0 UMP Spec](https://midi.org/specifications/midi-2-0)
- [Skill: webtransport-quic-patterns](sensorium-harness/skills/webtransport-quic-patterns/SKILL.md)
- [quinn 0.11](https://crates.io/crates/quinn)