# ADR-004: WebGPU Compute Shaders for DSP

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need GPU-accelerated audio processing for:
- Real-time FFT/iFFT (1024-8192 points, <0.1ms)
- Convolution reverb (partitioned convolution)
- Oversampling filters (rubato on GPU)
- Visualization: spectrum, oscilloscope, 3D scene (10k nodes @ 60fps)
- Zero-copy audio↔GPU pipeline (wgpu + ringbuf)

Previous: CPU-only fundsp - limited parallelism, no visual integration.

## Decision

Adopt **wgpu 0.19** with **WGSL compute shaders** for DSP + **instanced rendering** for visuals.

### Implementation Details

```toml
# Cargo.toml
wgpu = { version = "0.19", features = ["wgsl", "trace"] }
pollster = "0.3"
bytemuck = "1.14"
naga = "0.14"  # WGSL → SPIR-V/MSL/DXIL
```

### Compute Shader Pipeline
```wgsl
// FFT compute shader (Cooley-Tukey, iterative, in-place)
@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@group(0) @binding(1) var<storage, read> twiddle: array<vec2<f32>>;

@compute @workgroup_size(256)
fn fft(@builtin(global_invocation_id) id: vec3<u32>) {
    // Iterative butterfly stages
    // Bit-reversal handled via index permutation
}
```

### Zero-Copy Audio↔GPU
```
Audio Thread (RT)          GPU Timeline
    │                          │
    ├─ ringbuf.push(audio) ───►│
    │                          │ wgpu::Queue::write_buffer()
    │                          │ (mapped at submit, not wait)
    │                          ▼
    │                     Compute Shader
    │                     (FFT/Convolution)
    │                          │
    │                          ▼
    │                     wgpu::Buffer::slice()
    │                          │
    │◄─ ringbuf.pop(result) ───┤
    ▼                          ▼
```

### Instanced Rendering (10k nodes @ 60fps)
```wgsl
struct Instance {
    transform: mat4x4<f32>,
    color: vec4<f32>,
    audio_param: f32,  // Driven by GPU audio output
}

@vertex
fn vs_main(
    @builtin(vertex_index) vid: u32,
    @builtin(instance_index) iid: u32,
    @location(0) pos: vec3<f32>,
    @binding(0) instances: array<Instance>
) -> @builtin(position) vec4<f32> {
    return instances[iid].transform * vec4<f32>(pos, 1.0);
}
```

## Consequences

### Positive
- 10-100x parallelism for FFT/convolution
- Single API: WebGPU (native + browser via web-sys)
- Zero-copy: wgpu Buffer ↔ ringbuf (mapped at submit)
- WGSL: portable, SPIR-V/MSL/DXIL backends
- Compute + graphics unified: visualizations share audio data

### Negative
- WebGPU not in all browsers (Safari behind flag)
- GPU timeline sync adds complexity (fences/timestamps)
- Debugging compute shaders harder than CPU
- Minimum buffer alignment constraints (256B)

### Neutral
- CPU fallback path required (fundsp)
- wgpu 0.19 pre-1.0 (breaking changes possible)
- Timestamps: GPU timestamp queries for profiling

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| CUDA + custom | Mature, max perf | NVIDIA only, no browser | Platform lock-in |
| Metal compute | Apple native | macOS/iOS only | No cross-platform |
| OpenCL | Cross-platform | Deprecated, verbose | Legacy, no browser |
| CPU SIMD (fundsp) | Portable, simple | 10-100x slower for FFT | Can't meet <0.1ms |

## References

- [wgpu 0.19](https://crates.io/crates/wgpu)
- [WebGPU Spec](https://gpuweb.github.io/gpuweb/)
- [Skill: webgpu-compute-patterns](sensorium-harness/skills/webgpu-compute-patterns/SKILL.md)
- [Naga WGSL Compiler](https://github.com/gfx-rs/naga)

## Fact-Forcing Gate Metadata

**Importers/Callers**: 
- `crates/sensorium-dsp/src/gpu/` - GPU compute pipeline module
- `crates/sensorium-visual/src/render/` - Instanced rendering module
- `crates/sensorium-plugin/src/editor/` - Vizia editor integration

**Affected API**:
- `GpuDspEngine::new(device: &wgpu::Device, queue: &wgpu::Queue) -> Self`
- `GpuDspEngine::process(&mut self, input: &[f32], output: &mut [f32]) -> Result<(), GpuError>`
- `VisualEngine::render(&mut self, audio_data: &GpuBuffer, frame: &wgpu::TextureView)`

**Data Schemas**:
- WGSL compute shader bindings: `data: array<f32>`, `twiddle: array<vec2<f32>>`
- Instance buffer layout: `Instance { transform: mat4x4<f32>, color: vec4<f32>, audio_param: f32 }`
- Ringbuf element: `AudioFrame { samples: [f32; 512], timestamp: u64 }`

**User Instruction**: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."