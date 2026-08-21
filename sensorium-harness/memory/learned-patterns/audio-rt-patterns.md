# Learned Pattern: Real-Time Audio Thread Safety

## Context
Sensorium audio callback must never allocate, block, or lock.

## Solution
- Pre-allocate buffers at init.
- Use `ringbuf` for lock-free audio<->GUI communication.
- Route parameter changes via atomic reads.
- Move expensive work to background tasks.

## Verification
- Kani proof: no-panic + no-alloc for process path.
- Criterion benchmark: p99 latency budget enforced.
- Chaos test: simulate GUI lag; audio must not stall.

## Source
Gate M1 practice + nih-plug-development skill