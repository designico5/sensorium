---
name: candle-local-llm
description: Use when wiring local LLM inference with candle, llamafile, quantization, Metal/WebGPU/CUDA backends, and function calling for session management.
---

# Candle + Local LLM

## Overview
Hugging Face `candle` enables CPU/CUDA/Metal/WebGPU inference from Rust. `llamafile` provides single-file deployment. Use this skill when embedding on-device LLMs or neural audio models (RAVE/DDSP) in Sensorium.

## When to Use
- On-device assistant / parameter suggestion
- Local inference with no external API
- GGUF/quantized model loading (Q4_K_M)
- Function calling over local model outputs
- Metal/CUDA acceleration from a Rust host

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
candle = { version = "0.6", features = ["cuda", "metal", "cublas", "flash-attn"] }
candle-nn = "0.6"
candle-transformers = "0.6"
tokenizers = "0.19"
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }

[features]
default = ["candle"]
candle = []
llamafile = ["reqwest"]
```

### Model Loading (Metal/CUDA)
```rust
let device = candle::Device::new_metal(0)?;
let model = Llama::load(&model_path, &device)?;
```

### llamafile HTTP Client
```rust
pub struct LlamafileClient { base_url: String, client: reqwest::Client }
impl LlamafileClient {
  pub async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse> { ... }
}
```

## Verification
```bash
# inference latency + memory
cargo bench --package sensorium-ai
```

## Common Mistakes
- Huge model files packaged with installer; ship external model download
- Blocking model load on audio thread; use async + background task
- Forgetting Metal/CUDA init latency; pre-warm or lazy-init
- Not capping context length; prune session history