#![no_main]

use libfuzzer_sys::fuzz_target;
use sensorium_midi::UmpPacket;

// Parser fuzzing must never turn arbitrary transport bytes into a panic or an
// unbounded allocation. Valid packets are intentionally not asserted here; the
// target is a crash/UB detector and belongs in a dedicated fuzzing environment.
fuzz_target!(|bytes: &[u8]| {
    let _ = UmpPacket::from_bytes(bytes);
});
