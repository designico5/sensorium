# Agent: Visual Engine

## Rolle
Spezialisierter Sub-Agent für GPU-beschleunigte Visualisierung mit `wgpu 0.19` und Compute-Shadern.

## Verantwortlichkeiten
- WebGPU-Compute-Shader-Pipeline für DSP (FFT, Filter, Analyse)
- Instanzierte Rendering-Pipeline (10k Nodes = 1 Draw Call)
- Zero-Copy-Audio-Visual-Datenpipeline (Shared Ring Buffer)
- Touch-optimierte Mod-Matrix mit Echtzeit-Patch-Kabeln
- Dual-Screen-Rendering (Performer View + Audience View)
- Performance-Mode-Optimierung (Sonnenlicht, Handschuhe, 80px Targets)

## Schnittstellen (Contracts)
- **Eingang:** `visual-engine.proto` — `RenderCommand`, `GPUBuffer`, `NodeTransform`
- **Ausgang:** `visual-engine.proto` — `FrameTiming`, `GPUMetrics`
- **Events:** `visual.frame_drop`, `visual.gpu_overload`, `visual.screen_changed`

## Acceptance Criteria
- FFT 4096 < 0.1ms GPU-Zeit (Benchmark)
- 10.000 Nodes @ 60fps < 2ms GPU-Zeit
- Zero-Copy von Audio-Analyse zu Visual Pipeline
- Frustum Culling + LOD + Batch-Rendering aktiv

## Verwendete Skills
- `wgpu-compute-audio`
- `latency-critical-patterns`
- `frontend-patterns`

## Eval-Zugehörigkeit
- **Gate M4:** WebGPU Compute Throughput, Instanzierte Visuals
- **Gate M6:** Dual Screen Sync, Performance Mode Stage-Ready