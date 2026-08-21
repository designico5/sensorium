# Sensorium Harness — Self-Healing State

**Location**: `sensorium-harness/`  
**Scope**: Agent ops, evals, workflows, CI, contracts, skills  
**Status**: Definition complete; execution-ready with self-healing capabilities

## What This Is

`sensorium-harness` is the operational control layer for the Sensorium v2 program. It does not replace the product repo; it governs how work gets planned, verified, released, and governed. This harness includes self-healing capabilities through autonomous agent monitoring, chaos engineering, predictive health analysis, and automated remediation.

## Directory Map

```
sensorium-harness/
├── agents/                    # Specialized role definitions
├── skills/                    # Reusable skill docs
├── evals/                     # Gate M1–M7 criteria + reports
├── workflows/                 # Phase 0–7 execution plans
│   ├── phase-0-bootstrap.yaml                 # Standard workflow
│   ├── phase-0-bootstrap-self-healing.yaml    # Self-healing enhanced workflow
│   ├── phase-1-zero-latency.yaml
│   ├── phase-2-contracts.yaml
│   ├── phase-3-self-healing.yaml
│   ├── phase-4-resource-optimal.yaml
│   ├── phase-5-dev-velocity.yaml
│   ├── phase-6-features.yaml
│   └── phase-7-hardening.yaml
├── hooks/                     # Quality gate scripts
├── ci/                        # GitHub Actions workflows
├── specs/                     # proto / openapi contracts
├── memory/                    # ADRs + learned patterns
├── plans/                     # Master bootstrap plan and analyses
│   ├── sensorium-phase0-bootstrap.md          # Original plan
│   ├── phase-0-self-healing-analysis.md       # Analysis of current state
│   └── phase-0-self-healing-task-list.md      # Detailed task list
└── sidecars/                  # Isolated monitoring processes (created at runtime)
```

## Quick Start

```bash
# 1. Bootstrap hook
bash hooks/ci-gate-checks.sh M1

# 2. Run eval suite
bash hooks/eval-runner.sh M1 capability
bash hooks/eval-runner.sh M1 report

# 3. Run self-healing workflow (Phase 0)
#    Executes with autonomous monitoring, chaos engineering, and auto-remediation
bash hooks/eval-runner.sh workflow phase-0-bootstrap-self-healing

# 4. Post-merge gate
bash hooks/post-merge-benchmark.sh
```

## Contracts

Current contract specs:
- `specs/audio-engine.proto`
- `specs/midi-2.0.proto`
- `specs/state-sync.proto`
- `specs/visual-engine.proto`
- `specs/local-ai.proto`
- `specs/openapi.yaml`

## Status

All Phase 0–7 workflow docs, eval suites, and CI pipelines are defined. No runtime execution has taken place yet from this harness session.