---
name: wgpu-compute-audio
description: Use when implementing GPU audio DSP with wgpu compute shaders, zero-copy audio-visual pipelines, instanced rendering, and WebGPU-native fallbacks.
---

# WGPU Compute Audio

## Overview
`wgpu` + WebGPU compute shaders enable parallel DSP (FFT, convolution, filters) directly on the GPU with zero-copy buffers. Combined with instanced rendering, this yields a unified GPU pipeline for audio-reactive visuals without CPU/GPU round-trips.

## When to Use
- FFT / convolution / filter banks needing < 0.1 ms
- 10k+ visualized nodes/particles driven by audio
- Shared memory paths between audio analysis and rendering
- Progressive fallback to CPU (`wgpu` software rasterizer + `candle` CPU)

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
wgpu = { version = "0.19", features = ["wgsl", "trace"] }
pollster = "0.3"
bytemuck = "1.14"
naga = "0.14"
```

### Compute Shader (FFT-style analysis)
```wgsl
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= arrayLength(&input)) { return; }
  output[i] = input[i] * params.gain;
}
```

### Zero-Copy Audio -> GPU Buffer
```rust
let buffer = device.create_buffer(&wgpu::BufferDescriptor {
  label: Some("audio-interleaved"),
  size: (samples * 4) as u64,
  usage: wgpu::BufferUsage::STORAGE | wgpu::BufferUsage::COPY_DST,
  mapped_at_creation: true,
});
buffer.get_mapped_range_mut().copy_from_slice(interleaved_f32);
buffer.unmap();
```

### Instanced Renderer (10k nodes, 1 draw)
```rust
let instances = (0..N).map(|i| Instance { transform, color, audio_param }).collect::<Vec<_>>();
let instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
  label: Some("instances"),
  contents: bytemuck::cast_slice(&instances),
  usage: wgpu::BufferUsage::VERTEX,
});
render_pass.draw(0..6, 0..N as u32);
```

## Verification
```bash
# GPU timestamp queries / profiling
cargo bench --package sensorium-visual -- fft_gpu
```

## Common Mistakes
- CPU readback every frame; keep data on GPU
- Unbounded workgroup sizes; benchmark 64/128/256
- Ignoring fallback path when WebGPU unavailable
- Uploading same buffer twice; reuse via ring buffer