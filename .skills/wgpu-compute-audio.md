# WGPU Compute Audio Skill

## When to Use
Building GPU-accelerated audio visualization and compute pipelines using wgpu for Sensorium, with focus on real-time FFT, filter rendering, and zero-copy audio-to-GPU paths.

## Core Architecture

### WGPU Instance & Device
```rust
// sensorium-visual/src/gpu.rs
use wgpu::{Instance, Device, Queue, Surface};

pub struct AudioGpuPipeline {
    instance: Instance,
    device: Device,
    queue: Queue,
    surface: Surface<'static>,
}

impl AudioGpuPipeline {
    pub async fn new(window: impl Into<raw_window_handle::RawWindowHandle>) -> Result<Self> {
        let instance = Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        
        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            ..Default::default()
        }).await.ok_or("No GPU adapter found")?;
        
        let (device, queue) = adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::COMPUTE_SHADERS,
                ..Default::default()
            },
            None,
        ).await?;
        
        Ok(Self { instance, device, queue, /* ... */ })
    }
}
```

### Zero-Copy Audio → GPU Path
```rust
use ringbuf::{RingBuffer, SharedHeapRb};

pub struct AudioGpuBridge {
    audio_rb: SharedHeapRb<f32>,
    gpu_buffer: wgpu::Buffer,
}

impl AudioGpuBridge {
    pub fn new(device: &Device, size: usize) -> Result<Self> {
        let audio_rb = SharedHeapRb::<f32>::new(size);
        
        // GPU buffer with MAP_READ for direct CPU writes (if supported)
        let gpu_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Audio Ring Buffer"),
            size: (size * std::mem::size_of::<f32>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });
        
        Ok(Self { audio_rb, gpu_buffer })
    }
    
    pub fn upload_audio(&self, queue: &Queue) {
        // Read from ringbuf
        let data = self.audio_rb.iter().collect::<Vec<f32>>();
        
        // Upload to GPU
        queue.write_buffer(&self.gpu_buffer, 0, bytemuck::cast_slice(&data));
    }
}
```

### Compute Shader for FFT
```rust
// shader.wgsl
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;
@group(0) @binding(2) var<uniform> params: FftParams;

struct FftParams {
  n: u32,
  stage: u32,
  direction: u32,
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.n) { return; }
  
  // Cooley-Tukey FFT stage
  let even = input[idx * 2];
  let odd = input[idx * 2 + 1];
  let twiddle = complex_mul(exp(-2.0 * 3.14159 * f32(idx) / f32(params.n)), odd);
  
  output[idx] = even + twiddle;
}
```

```rust
// Rust compute pass
pub fn run_fft_compute_pass(&self, input: &[f32], output: &mut [f32]) {
    let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("FFT Compute Pass"),
    });
    
    {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("FFT"),
            timestamp_writes: None,
        });
        
        pass.set_pipeline(&self.fft_pipeline);
        pass.set_bind_group(0, &self.fft_bind_group, &[]);
        pass.dispatch_workgroups(input.len() as u32 / 256);
    }
    
    self.queue.submit(Some(encoder.finish()));
}
```

### Draw Pass for Visualization
```rust
pub fn render_spectrum(&self, fft_data: &[f32]) {
    let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Spectrum Render Pass"),
    });
    
    {
        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Spectrum"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: self.texture_view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(Color::BLACK),
                    store: wgpu::StoreOp::Store,
                },
            })],
            ..Default::default()
        });
        
        render_pass.set_pipeline(&self.spectrum_pipeline);
        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        render_pass.draw(0..fft_data.len() as u32, 0..1);
    }
    
    self.queue.submit(Some(encoder.finish()));
}
```

## Verification Gates

### Gate M4: GPU Compute Throughput
```bash
# Benchmark FFT on GPU
cargo bench --package sensorium-visual -- gpu_fft

# Targets:
# - FFT < 0.1ms for 1024 samples
# - 10k nodes @ 60fps sustained
```

### Gate M5: Zero-Copy Latency
```bash
# Benchmark audio → GPU roundtrip
cargo bench --package sensorium-visual -- audio_to_gpu

# Target: < 5ms end-to-end
```

## Common Fixes

### CPU Fallback
```rust
pub enum FftImplementation {
    Cpu(CpuFft),
    Gpu(GpuFft),
}

impl FftImplementation {
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        match self {
            FftImplementation::Cpu(cpu) => cpu.process(input, output),
            FftImplementation::Gpu(gpu) => gpu.process(input, output),
        }
    }
}
```

### WebGPU Availability Check
```rust
fn check_webgpu_support() -> bool {
    wgpu::Instance::new(wgpu::InstanceDescriptor {
        backends: wgpu::Backends::all(),
        ..Default::default()
    }).enumerate_adapters(wgpu::Backends::all()).next().is_some()
}
```

## Verification Report Template
```
WGPU COMPUTE AUDIO REPORT
=========================
GPU Adapter:        [PASS/FAIL] (vendor X)
FFT Latency:        [PASS/FAIL] (X µs, target: < 100 µs)
Zero-Copy Path:     [PASS/FAIL] (X ms)
CPU Fallback:       [PASS/FAIL]
Spectrum Render:    [PASS/FAIL]
Overall:            [READY/NOT READY]
```