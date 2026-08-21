# Candle Local LLM Skill

## When to Use
Integrating Candle-based local LLM inference (llamafile, Candle models) into Sensorium for on-device AI without network dependency, with focus on low-latency first-token generation and hot model reload.

## Core Architecture

### Device Selection
```rust
// sensorium-ai/src/engine.rs
use candle::Device;

pub struct LocalAiEngine {
    device: Device,
    model: Option<LlamaModel>,
    tokenizer: Option<Tokenizer>,
}

impl LocalAiEngine {
    pub fn new() -> Result<Self> {
        // Prefer Metal on macOS, CUDA on NVIDIA, CPU fallback
        let device = Device::new_metal(0)
            .or_else(|_| Device::new_cuda(0))
            .unwrap_or_else(|_| Device::Cpu);
        
        Ok(Self { device, model: None, tokenizer: None })
    }
    
    pub fn load_model(&mut self, path: &str) -> Result<()> {
        let mut model = LlamaModel::load(&self.device, path, &Default::default())?;
        self.model = Some(model);
        Ok(())
    }
}
```

### HIPER Inference (Hot Reload)
```rust
pub struct HotReloadManager {
    current_model: Arc<RwLock<Option<LlamaModel>>>,
    pending_model: Arc<RwLock<Option<LlamaModel>>>,
}

impl HotReloadManager {
    pub async fn swap_model(&self, new_path: String) -> Result<()> {
        // Load new model in background
        let device = Device::new_metal(0)?;
        let new_model = LlamaModel::load(&device, &new_path, &Default::default())?;
        
        // Atomic swap
        let mut pending = self.pending_model.write();
        *pending = Some(new_model);
        
        // Swap under read lock
        let mut current = self.current_model.write();
        *current = pending.take();
        
        Ok(())
    }
    
    pub fn infer(&self, prompt: &str) -> Result<String> {
        let model = self.current_model.read();
        model.as_ref().unwrap().infer(prompt)
    }
}
```

### LlamaFile HTTP Client
```rust
use reqwest::Client;

pub struct LlamaFileClient {
    client: Client,
    endpoint: String,
}

impl LlamaFileClient {
    pub async fn infer(&self, prompt: &str) -> Result<String> {
        let start = Instant::now();
        
        let response = self.client
            .post(&format!("{}/completion", self.endpoint))
            .json(&CompletionRequest { prompt, max_tokens: 256 })
            .send()
            .await?;
        
        let latency = start.elapsed();
        if latency > Duration::from_millis(500) {
            warn!("First token latency > 500ms: {:?}", latency);
        }
        
        Ok(response.text().await?)
    }
}
```

## Verification Gates

### Gate M5: LLM Inference Speed
```bash
# Benchmark first token latency
cargo bench --package sensorium-ai -- llama_inference

# Target: < 500ms first token, no block on audio thread
```

### Gate M6: Hot Reload Speed
```bash
# Benchmark model swap
cargo bench --package sensorium-ai -- hot_reload

# Target: < 200ms for Rust/TS reload cycle
```

## Integration with Audio Thread
```rust
// Ensure AI inference never blocks audio callback
pub struct AiBackend {
    tx: mpsc::Sender<InferenceRequest>,
}

impl AiBackend {
    pub fn infer_async(&self, prompt: &str) -> oneshot::Receiver<String> {
        let (tx, rx) = oneshot::channel();
        let _ = self.tx.send(InferenceRequest { prompt: prompt.into(), response: tx });
        rx
    }
}
```

## Common Fixes

### Metal Device Init
```rust
// macOS Metal backend
let device = Device::new_metal(0)?;

// Fallback to CUDA if Metal unavailable
let device = Device::new_metal(0)
    .or_else(|_| Device::new_cuda(0))?
    .or_else(|_| Err("No GPU device available"))?;
```

### Model Format (GGUF / GGML)
```rust
// Load GGUF model via candle
use candle::quantized::gguf_file;

pub fn load_gguf(path: &str, device: &Device) -> Result<QuantizedLlama> {
    let gguf = gguf_file::LlamaGguf::load(path)?;
    Ok(QuantizedLlama::from_gguf(gguf, device)?)
}
```

## Verification Report Template
```
LOCAL LLM REPORT
================
Device:           [PASS/FAIL] (Metal/CUDA/CPU)
First Token:      [PASS/FAIL] (X ms, target: < 500ms)
Hot Reload:       [PASS/FAIL] (X ms, target: < 200ms)
Memory:           [PASS/FAIL] (max X MB)
Audio Thread:     [PASS/FAIL] (no blocking)
Overall:          [READY/NOT READY]
```