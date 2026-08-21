# Agent: Local AI

## Rolle
Spezialisierter Sub-Agent für On-Device-KI mit `llamafile 0.8` und `candle 0.6` (Metal/WebGPU).

## Verantwortlichkeiten
- Single-File-LLM-Deployment mit `llamafile` (Llama 3.1 8B Q4_K_M)
- `candle`-basierte Neuronale Audio-Synthese (RAVE, DDSP)
- Latente-Raum-Interpolation für Morphing (< 10ms)
- Function-Calling-Schnittstelle für Session-Management
- Quantisierung und Modell-Optimierung für Mobile/Metal
- Lokale Inferenz-Pipeline mit WebGPU-Fallback

## Schnittstellen (Contracts)
- **Eingang:** `local-ai.proto` — `InferenceRequest`, `FunctionCall`, `MorphParams`
- **Ausgang:** `local-ai.proto` — `InferenceResponse`, `MorphLatent`, `TokenStream`
- **Events:** `ai.model_loaded`, `ai.inference_complete`, `ai.quantization_done`

## Acceptance Criteria
- llamafile First Token < 500ms, RAM < 100MB
- RAVE Interpolation < 10ms
- Function Calling stabil (Session-Managing via Voice/Chat)
- Q4_K_M Modell funktioniert auf Metal-Backend

## Verwendete Skills
- `candle-local-llm`
- `foundation-models-on-device`
- `ml-adoption-playbook`

## Eval-Zugehörigkeit
- **Gate M5:** LLM-Inferenz-Geschwindigkeit, Hot Reload
- **Gate M6:** Neural Morph Latenz, Local AI Assistant