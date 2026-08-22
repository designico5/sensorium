# Sensorium Stage-Test-Matrix

This is the authoritative verification ledger for a physical Sensorium stage deployment. It deliberately separates browser/demo evidence from physical hardware-in-the-loop (HIL) evidence.

## Release rule

No feature may be called stage-ready from a screenshot, a generated value, a local demo, or a green unit test alone. A row becomes `PASS` only after its evidence contains the exact device, firmware, driver, operating system, connection, expected result, measured result, latency, jitter, failure behavior, recovery time, timestamp, operator and log reference.

The machine-readable source is [`stage-test-matrix.json`](./stage-test-matrix.json). The status values are:

- `PASS`: evidence complete and independently reviewable.
- `PARTIAL`: a subset is proven; the remaining boundary is open.
- `AUTOMATED_OPEN`: an automated test contract exists or is ready to be added, but the required run is not yet recorded.
- `HIL_REQUIRED`: a real device, display, network or operating condition is required.
- `BLOCKED_BUILD`: the implementation cannot be trusted until the native build or parser is repaired.
- `BLOCKED_SECURITY`: the path must remain disabled until authentication/authority controls are fixed.
- `NOT_STARTED`: no meaningful evidence exists yet.

## Current result

The browser demo is usable and explicitly marked as simulation. The isolated native MIDI crate currently passes 39 tests, the audio-DSP crate passes 21 tests, and the chaos crate passes 11 tests; those are software evidence only. A libFuzzer target now exercises arbitrary UMP parser input and is scheduled as a bounded Linux CI smoke run; the local Windows run is toolchain-blocked because clang/clang-cl is not installed. Health reports `Unknown` until a real check is registered, and unimplemented chaos experiments fail closed instead of reporting a false pass. The physical validation result remains **0% proven** because no completed HIL record exists in this repository. The current V2 frontend build and boundary tests do not change that verdict.

## Test domains

| Domain | Gate | Current interpretation |
| --- | --- | --- |
| Software | G1 | Some unit/boundary evidence exists; browser E2E, contracts, fuzzing, offline and rollback are open. |
| Audio hardware | G4 | HIL required for every driver, clock, disconnect and soak condition. |
| MIDI | G3 | Native parser and bounded endpoint identity evidence exists; physical hotplug, replacement and device records keep the gate closed. |
| Network and sync | G3 | Rogue-peer and certificate tests are blocked until the transport is authenticated. |
| Display and touch | G2 | CSS contains 4K/8K layout intent; real frame-time and multitouch evidence is missing. |
| Physical acceptance | G4 | Every device needs a signed record using the schema in the JSON ledger. |

## Evidence record format

Store one JSON record per run under a future `evidence/stage/` directory. A record must include:

```json
{
  "testId": "AUD-006",
  "device": "owner-supplied exact model",
  "firmware": "vendor version",
  "driver": "driver version",
  "os": "OS build",
  "connection": "port / protocol / cable",
  "testCase": "disconnect during playback",
  "expected": "output enters bounded safe state and recovers after explicit re-arm",
  "measured": "operator observation plus captured metrics",
  "latencyMs": 0,
  "jitterMs": 0,
  "failureMode": "observed failure and containment",
  "recoveryTimeMs": 0,
  "log": "relative path to immutable log",
  "timestamp": "ISO-8601",
  "operator": "named reviewer",
  "result": "PASS or FAIL"
}
```

## Required execution order

1. Clear the disk gate and make the working tree reproducible.
2. Make the Rust/native build and CI gates blocking and green.
3. Repair audio callback, MIDI/UMP parsing, identity, queues and health truth.
4. Authenticate transport and enforce one show authority.
5. Run software tests in a real browser, then run the display/touch matrix.
6. Run audio, MIDI and network HIL tests with the exact owner device list.
7. Run disconnect, recovery, soak and rollback tests.
8. Only after all required rows are `PASS`, generate signed release artifacts.

Until then, the V2 and MA-II-MI previews remain demonstration software and must stay fail-closed for physical output.
