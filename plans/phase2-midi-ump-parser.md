# Phase 2 – MIDI 2.0 UMP Parser Implementation Plan
## Objective
Implement a complete **MIDI 2.0 Universal MIDI Packet (UMP) parser** that supports both **Version 1.1** and **Version 2.0** specifications, capable of parsing all UMP message types, extracting metadata, and providing a clean API for the audio engine.

## Scope
- Parse UMP packets from raw byte streams.
- Support all UMP message types defined in the spec (e.g., **MIDI 2.0 Core** messages, **MIDI 2.0 Stream Events**, **MIDI 2.0 System Common**, **MIDI 2.0 System Real-Time**, **MIDI 2.0 MIDI 1.0 Compatibility**).
- Handle variable-length packets, status bytes, data bytes, and optional fields.
- Provide structs/enums that model UMP messages in Rust.
- Validate conformance to the spec (correct packet length, correct field ranges).
- Provide a simple API:
  - `Um Lump::from_bytes(&[u8]) -> Result<Um Lump, Um LumpParseError>`
  - Methods to access message type, channel, note, velocity, etc.
- Unit tests covering:
  - Each major UMP message type.
  - Edge cases (invalid lengths, out‑of‑range values).
  - Compatibility layer translating MIDI 1.0 messages to UMP equivalents.
- Documentation of the parsed structure and usage examples.

## Step‑by‑Step Breakdown
| Step | Description | Artifacts |
|------|-------------|-----------|
| 1 | **Spec Study** – Review the official MIDI 2.0 UMP specification (document links, examples). Highlight packet format, byte alignment, and message categories. | `research/midi2_spec_summary.md` |
| 2 | **Data Model Design** – Define Rust enums and structs: `Um Lump`, `UmpPacket`, `UmpHeader`, `UmpData`, etc. Map spec fields to Rust fields. | `src/midi/ump.rs` (data model) |
| 3 | **Byte Parsing Logic** – Implement a parser that reads a byte slice, validates packet length, extracts the header, and dispatches to the appropriate message struct. | `src/midi/ump_parser.rs` |
| 4 | **Message Type Handlers** – For each UMP message category, implement parsing logic (e.g., `Note On`, `Pitch Bend`, **MIDI 2.0 Specific** messages). | Individual `match` arms in parser |
| 5 | **Error Handling** – Create a custom error type (`Um LumpParseError`) covering I/O, length, and format errors. | `src/midi/error.rs` |
| 6 | **Compatibility Layer** – Implement conversion from MIDI 1.0 delta‑time/events to UMP packets where needed. | `src/midi/midi1_compat.rs` |
| 7 | **Unit Tests** – Write tests for each message type, ensuring round‑trip parsing (bytes → struct → bytes). | `src/midi/tests.rs` |
| 8 | **Documentation** – Document the public API, error types, and usage examples in `README.md` under `midi-ump`. | `README.md` section |
| 9 | **Integration** – Hook the parser into the audio engine’s MIDI input pipeline so that incoming MIDI 2.0 messages are parsed and routed to the appropriate internal representation. | Update `src/audio/midi_handler.rs` |
| 10 | **Review & Refactor** – Run the test suite, verify 100 % pass, refactor for readability and performance. | CI pipeline update |

## Dependencies
- `std` – standard library.
- `thiserror` – for defining error types (optional, can use `anyhow` for error handling).
- `byteorder` – for reading big‑endian/u16/u32 fields from byte slices.
- `num_enum` – for compact enum representation (optional).

Add to `Cargo.toml`:
```toml
[dependencies]
thiserror = "1.0"
byteorder = "1.5"
num_enum = "0.7"
```

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Specification misunderstanding → incorrect parsing | Breaks downstream MIDI handling | Cross‑check parsed output against known-good binary dumps; include conformance tests. |
| Performance bottlenecks in parsing large streams | Real‑time latency spikes | Use `no_std`‑compatible parsing where possible; benchmark with high‑throughput MIDI files. |
| Incomplete coverage of UMP message types | Missing features in the audio engine | Maintain a checklist of all UMP message categories; add tests for any missing ones. |
| Breaking API compatibility with existing MIDI 1.0 code | Regression in existing functionality | Keep the MIDI 1.0 compatibility layer separate; run regression tests before changes. |

## Exit Criteria
- All defined UMP message types parse correctly from byte slices.
- Error handling works for malformed packets.
- Unit tests achieve 100 % pass rate.
- Integration with the audio engine compiles and runs without panics.
- Documentation is complete and clear for future developers.

## Next Steps
1. Write `research/midi2_spec_summary.md` after reviewing the spec.
2. Define data model structs in `src/midi/ump.rs`.
3. Implement the parser in `src/midi/ump_parser.rs`.
4. Add comprehensive unit tests.
5. Integrate the parser into the audio engine’s MIDI input handling.

This plan can be handed off to a fresh agent or executed manually.