# ADR-005: llamafile + candle for Local AI

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need local LLM inference for:
- Code generation (plugin DSP, UI components)
- Parameter suggestion (knob mappings, automation curves)
- Natural language control ("make it sound warmer")
- Session analysis (pattern detection, arrangement suggestions)
- Offline-first: no API keys, no network, no rate limits

Previous: Cloud APIs (OpenAI, Anthropic) - latency, cost, privacy, **NVIDIA NIM free endpoint rate limits (60 req/min)**.

## Decision

Adopt **llamafile 0.8** (cosmopolitan binary) + **candle 0.6** (Rust, Metal/CUDA/WebGPU) for 100% local inference.

### Implementation Details

```toml
# Cargo.toml
candle = { version = "0.6", features = ["cuda", "metal", "cublas", "flash-attn"] }
candle-nn = "0.6"
candle-transformers = "0.6"
tokenizers = "0.19"
llamafile = "0.8"  # CLI tool, not library
```

### llamafile Deployment
```
# Download single-file binary (includes weights + runtime)
wget https://huggingface.co/Mozilla/llamafile/resolve/main/LLaVA-1.5-7B-llamafile

# Run: ./LLaVA-1.5-7B-llamafile -ngl 9999  # -ngl 9999 = all layers on GPU
# Serves OpenAI-compatible API on http://localhost:8080
```

### candle Integration (Rust-native)
```rust
use candle::{Device, Tensor, DType};
use candle_nn::VarBuilder;
use candle_transformers::models::llama::{Llama, Config};

// Device selection: CUDA > Metal > CPU
let device = Device::new_cuda(0)?;  // or Device::new_metal()?, Device::Cpu

let vb = VarBuilder::from_gguf("model.gguf", &device)?;
let model = Llama::load(vb, &Config::llama_7b())?;

// Inference
let logits = model.forward(&input_ids, 0)?;
let next_token = logits.argmax(D::Minus1)?;
```

### Model Selection (Quantized GGUF)
| Model | Size | VRAM | Quality | Use Case |
|-------|------|------|---------|----------|
| Phi-3-mini-4k-q4 | 2.3GB | 3GB | Good | Code gen, params |
| Llama-3.2-3B-q4 | 2GB | 3GB | Good | Fast chat, control |
| Mistral-7B-v0.3-q4 | 4GB | 5GB | Better | Complex reasoning |
| CodeLlama-7B-q4 | 4GB | 5GB | Best code | DSP/plugin code |

### Hot Reload Integration
```
llamafile (HTTP)     candle (Rust)     Sensorium
    │                    │                 │
    ├─ /v1/completions──►│                 │
    │                    │                 │
    │◄──── JSON ────────┤                 │
    │                    │                 │
    │                    ├─ hot_reload()──►│ Plugin params
    │                    │                 │ UI components
    │                    │                 │ DSP graph
```

## Consequences

### Positive
- **Zero rate limits**: 100% local, no NVIDIA NIM/API quotas
- **Privacy**: Audio/MIDI/project data never leaves machine
- **Latency**: <500ms first token (Metal/CUDA), streaming
- **Portability**: llamafile = single binary (Linux/macOS/Windows)
- **GPU acceleration**: candle supports CUDA, Metal, WebGPU
- **Quantization**: GGUF q4_k_m = 4-bit, near-fp16 quality

### Negative
- Model size: 2-5GB VRAM (quantized 7B)
- Initial download: one-time bandwidth
- Hardware requirement: GPU with 4GB+ VRAM recommended
- llamafile API: OpenAI-compatible but not identical

### Neutral
- CPU fallback: candle works on CPU (slower, ~5x)
- Model switching: restart llamafile or load new GGUF in candle
- Prompt engineering: same techniques as cloud APIs

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| NVIDIA NIM | Managed, optimized | **Free tier: 60 req/min**, cloud | Rate limits block dev velocity |
| Ollama | Easy model mgmt | Extra daemon, less portable | llamafile simpler |
| vLLM | High throughput | Complex, server-oriented | Overkill for local |
| ONNX Runtime | Cross-platform | Model conversion needed | candle native GGUF |
| Custom C++ llama.cpp | Max control | High maintenance | llamafile/candle maintained |

## References

- [llamafile](https://github.com/Mozilla-Ocho/llamafile)
- [candle](https://github.com/huggingface/candle)
- [GGUF Format](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Skill: llamafile-local-ai](sensorium-harness/skills/llamafile-local-ai/SKILL.md)
- [Hugging Face GGUF Models](https://huggingface.co/models?library=gguf)

## Fact-Forcing Gate Metadata

**Importers/Callers**:
- `crates/sensorium-ai/src/llamafile/` - llamafile HTTP client wrapper
- `crates/sensorium-ai/src/candle/` - candle native inference engine
- `crates/sensorium-plugin/src/ai_assist/` - Plugin AI assistance integration

**Affected API**:
- `LlamafileClient::new(base_url: &str) -> Self`
- `LlamafileClient::complete(&self, prompt: &str, params: CompletionParams) -> Result<String>`
- `CandleEngine::new(model_path: &Path, device: Device) -> Result<Self>`
- `CandleEngine::generate(&mut self, prompt: &str, max_tokens: usize) -> Result<String>`
- `AiAssist::suggest_params(&self, context: &PluginContext) -> ParamSuggestions`

**Data Schemas**:
- Completion request: `{ prompt: String, max_tokens: u32, temperature: f32, stream: bool }`
- GGUF model config: `Config { vocab_size, hidden_size, num_layers, num_heads, ... }`
- Param suggestions: `{ param_id: String, suggested_value: f32, confidence: f32, reasoning: String }`

**User Instruction**: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."