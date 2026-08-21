# Learned Pattern: MIDI 2.0 UMP over QUIC

## Context
Low-latency MIDI 2.0 transport with 0-RTT reconnect and browser clients.

## Solution
- Multiplex streams by priority: MIDI first.
- Use bounded channels + try_send to apply backpressure.
- Maintain session tickets for 0-RTT and validate on reconnect.
- Provide WebSocket fallback for restrictive networks.

## Verification
- 0-RTT reconnect benchmark.
- Load test for concurrent stream count.
- Fallback path exercised in CI.

## Source
Gate M1/M4 practice + webtransport-quic-patterns skill