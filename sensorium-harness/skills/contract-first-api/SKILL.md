---
name: contract-first-api
description: Use when evolving sensorium API/event/transport boundaries with Protobuf, OpenAPI, generated Rust/TS types, and contract drift checks.
---

# Contract-First API

## Overview
Define the boundary artifact first, generate consumer/provider types, then verify producer output against the artifact before integration. Prevents field drift and silent contract drift.

## When to Use
- Sensorium audio/MIDI/state/AI service boundaries
- Protobuf/OpenAPI definitions in `specs/`
- Cross-language contracts between Rust core and TS frontend
- Parallel implementation by multiple agents

## Core Pattern

1. Consumer jobs
2. Smallest useful contract
3. Generate types
4. Provider verification
5. Integrate by comparing evidence

Tooling hook points:
- `crates/sensorium-proto` generated Rust
- `packages/sensorium-shared` generated TS
- CI gate: contract validation tests

## Verification
```bash
npm run generate:types
cargo test contract_validation
```

## Common Mistakes
- Duplicating schemas in wiki + mock + implementation
- Changing implementation first and contract later
- exposing storage models as public APIs