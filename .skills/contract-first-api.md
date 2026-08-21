# Contract First API Skill

## When to Use
Ensuring the Sensorium API boundary (REST via OpenAPI and gRPC via Protobuf) stays synchronized across Rust backend and TypeScript frontend, with vehicle for drift detection, code generation, and contract-valid integration testing.

## Contract Rules

1. **Single artifact per boundary** — One authoritative OpenAPI or Protobuf file per service boundary. No duplicate payload shapes in wiki, mocks, or code.
2. **Consumer-first design** — Design from what each consumer must accomplish, never from database rows or internal classes.
3. **Generate, don’t copy** — Generate TypeScript clients and Rust servers from the contract. Handwritten copies drift.
4. **Drift detection** — Every commit must pass a contract validation check.
5. **Change protocol** — Contract change → regenerate types → update provider/consumer → verify both sides → merge.

---

## Sensorium Contract Map

| Boundary | Artifact | Provider | Consumer |
|----------|----------|----------|----------|
| Audio Engine | `specs/audio-engine.proto` + OpenAPI | `sensorium-audio` | Frontend DAW UI |
| MIDI 2.0 | `specs/midi-2.0.proto` | `sensorium-midi` | Frontend / hardware clients |
| State Sync | `specs/state-sync.proto` | `sensorium-sync` | Yjs + Rust backend |
| Visual Engine | `specs/visual-engine.proto` | `sensorium-visual` | Frontend renderer |
| Local AI | `specs/local-ai.proto` | `sensorium-ai` | Frontend / agents |
| REST API | `openapi.yaml` | server.ts | TypeScript frontend |

---

## Protobuf Artifacts

### audio-engine.proto
```protobuf
syntax = "proto3";
package sensorium.audio;

message AudioCallback {
  float buffer = 1;
  float sample_rate = 2;
  uint32 channel_count = 3;
}

message Parameter {
  string id = 1;
  float value = 2;
  string name = 3;
  string unit = 4;
}

message Transport {
  bytes midi_event = 1;
  TransportType type = 2;
}

enum TransportType {
  PLAY = 0;
  STOP = 1;
  PAUSE = 2;
  RECORD = 3;
}
```

### midi-2.0.proto
```protobuf
syntax = "proto3";
package sensorium.midi;

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

### state-sync.proto
```protobuf
syntax = "proto3";
package sensorium.sync;

message AutomergeOp {
  string operation_type = 1;
  string object_id = 2;
  bytes encoding = 3;
}

message SyncMessage {
  string peer_id = 1;
  int64 timestamp = 2;
  repeated AutomergeOp operations = 3;
}

message DocumentPatch {
  repeated AutomergeOp changes = 1;
  ConflictResolution conflict_resolution = 2;
}

enum ConflictResolution {
  AUTOMERGE = 0;
  LAST_WRITE_WINS = 1;
  CUSTOM = 2;
}
```

---

## OpenAPI REST API (openapi.yaml)

```yaml
openapi: 3.1.0
info:
  title: Sensorium API
  version: "1.0"

paths:
  /audio/callback:
    post:
      summary: Process audio callback
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AudioCallback'
      responses:
        '200':
          description: Processed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProcessedAudio'

  /midi/ump:
    post:
      summary: Send MIDI 2.0 UMP message
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UMPMessage'
      responses:
        '202':
          description: Accepted

components:
  schemas:
    AudioCallback:
      type: object
      required: [buffer, sample_rate, channel_count]
      properties:
        buffer: { type: array, items: { type: number, format: float } }
        sample_rate: { type: integer, format: int64 }
        channel_count: { type: integer }

    UMPMessage:
      type: object
      required: [ump_type, timestamp, payload]
      properties:
        ump_type: { type: integer }
        timestamp: { type: integer, format: int64 }
        payload: { type: string, format: byte }
```

---

## Code Generation

### Rust from Protobuf (build.rs)
```bash
# Cargo.toml deps
prost = "0.12"
tonic = "0.11"
tonic-build = "0.11"
prost-types = "0.12"

# build.rs
fn main() -> Result<()> {
    tonic_build::compile_protos("specs/audio-engine.proto")?;
    tonic_build::compile_protos("specs/midi-2.0.proto")?;
    tonic_build::compile_protos("specs/state-sync.proto")?;
    Ok(())
}
```

### TypeScript from OpenAPI
```json
// package.json scripts
{
  "generate:types": "openapi-typescript openapi.yaml --output src/api/types.ts"
}
```

```bash
npm run generate:types
```

---

## Drift Detection

### Contract Validation Job
```yaml
# .github/workflows/contract.yml
name: Contract Drift Detection

on: [push, pull_request]
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run generate:types
      - run: git diff --exit-code src/api/types.ts  # fail if drift
      - run: cargo build  # fail if proto-generated code doesn't compile
```

### Manual Drift Check
```bash
# Check proto vs Rust structs diff
cargo audit --target-dir target

# Verify OpenAPI vs frontend types
npm run generate:types && git diff src/api/types.ts
```

---

## Verification Report Template
```
CONTRACT FIRST REPORT
=====================
Protobuf Files:    [PASS/FAIL] (X .proto files)
OpenAPI:           [PASS/FAIL]
Rust Generation:   [PASS/FAIL]
TS Generation:     [PASS/FAIL]
Drift Detection:   [PASS/FAIL] (0 diffs)
Provider Tests:    [PASS/FAIL]
Consumer Tests:    [PASS/FAIL]
Overall:           [READY/NOT READY]
```