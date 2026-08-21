# ADR-001: NIH-Plug Audio Engine

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need a production-ready audio plugin framework that:
- Targets VST3, CLAP, and Standalone from single codebase
- Guarantees real-time safety (no allocations, no locks in audio thread)
- Provides GPU-accelerated GUI (Vizia)
- Supports parameter automation and preset management
- Integrates with fundsp DSP primitives and rubato resampling

Previous approach: Custom Rust audio thread + custom DSP + custom plugin host - high maintenance, no DAW integration.

## Decision

Adopt **NIH-Plug 0.8** as the audio engine foundation with features: `vst3`, `clap`, `standalone`, `vizia`.

### Implementation Details

```toml
# Cargo.toml
nih-plug = { version = "0.8", features = ["vst3", "clap", "standalone", "vizia"] }
nih-plug-vizia = "0.8"
fundsp = "0.11"
rubato = "0.16"
cpal = { version = "0.16", features = ["asio", "jack", "wasapi", "coreaudio"] }
ringbuf = "0.4"
```

### Architecture
```
Audio Callback (RT thread, <0.5ms p99)
    → Read smoothed params (atomic)
    → fundsp DSP graph (SIMD)
    → ringbuf.push() to GUI (lock-free)
    → Return
    
GUI Thread (Vizia, 60fps)
    → ringbuf.pop() audio data
    → Render spectrum/waveform
    → ParamSlider ↔ smoothed params
```

## Consequences

### Positive
- 50% less code vs custom implementation
- Native VST3/CLAP/Standalone builds
- RT-safe by construction (nih-plug enforces)
- GPU-accelerated declarative GUI (React-like)
- Built-in parameter smoothing, automation, presets
- Active maintenance, growing ecosystem

### Negative
- Learning curve for Vizia (new paradigm)
- NIH-Plug 0.8 still pre-1.0 (breaking changes possible)
- VST3 SDK licensing for distribution
- Windows ASIO requires separate SDK

### Neutral
- fundsp DSP primitives cover 80% of needs
- Custom DSP still possible via `AudioUnit` trait
- rubato adds ~2% CPU for high-quality resampling

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Custom audio thread + vst-rs | Full control | No CLAP, no standalone, manual RT safety | High maintenance, no GUI framework |
| JUCE (C++) | Mature, all formats | C++, heavy, licensing | Language mismatch, not Rust-native |
| Clap-rs + custom GUI | CLAP only | No VST3, no standalone, manual GUI | Incomplete format coverage |
| xtask + custom plugin host | Full control | Enormous effort, no ecosystem | Reinventing wheel |

## References

- [NIH-Plug 0.8 Release Notes](https://github.com/robbert-vdh/nih-plug/releases)
- [Skill: nih-plug-development](sensorium-harness/skills/nih-plug-development/SKILL.md)
- [Skill: latency-critical-systems](sensorium-harness/skills/latency-critical-systems/SKILL.md)
- [Fundsp 0.11](https://crates.io/crates/fundsp)
- [Rubato 0.16](https://crates.io/crates/rubato)