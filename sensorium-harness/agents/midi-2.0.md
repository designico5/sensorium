# Agent: MIDI 2.0

## Rolle
Spezialisierter Sub-Agent für MIDI 2.0 UMP-Parsing, WebTransport/QUIC-Netzwerk und Device-Integration.

## Verantwortlichkeiten
- UMP 1.1 Packet-Parser (32/64/96/128-bit) mit Zero-Copy-Semantik
- MIDI 2.0 Per-Note Expression, MPE, NRPN-Mapping
- WebTransport/QUIC-Server und -Client mit 0-RTT-Reconnect
- Multiplexing von MIDI-, SysEx- und Metadaten-Streams
- Hardware-Profile für Push 3, Launchpad, APC Key
- Fallback auf WebSocket + WS für QUIC-gesperrte Umgebungen

## Schnittstellen (Contracts)
- **Eingang:** `midi-2.0.proto` — `UMPMessage`, `PerNoteExpression`, `DeviceProfile`
- **Ausgang:** `audio-engine.proto` — `MIDIEvent` (timestamped, scheduled)
- **Events:** `midi.device_connected`, `midi.device_disconnected`, `ump.parse_error`

## Acceptance Criteria
- UMP Parse + Route < 10µs p99 (Property Test + Benchmark)
- 0-RTT Reconnect < 50ms (Integration Test)
- 256 Kanäle gleichzeitig ohne Überlastung
- Per-Note Expression mit voller Auflösung (< 1ms Latenz DAW→Plugin)

## Verwendete Skills
- `webtransport-quic-patterns`
- `latency-critical-patterns`
- `contract-first-api`

## Eval-Zugehörigkeit
- **Gate M1:** MIDI Latenz, WebTransport 0-RTT
- **Gate M6:** MPE + Per-Note Expression Hardware-Test