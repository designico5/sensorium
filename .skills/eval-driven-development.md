# Eval-Driven Development Skill

## When to Use
Automating evaluation gates, regression suites, and capability benchmarks for Sensorium Phase 0, using an eval runner that produces JSON reports and enforces pass thresholds before merge or release.

## Core Concepts

- **Capability eval** — does the code satisfy the spec right now?
- **Regression eval** — did we break something that was already passing?
- **Gate eval** — hard stop on CI if thresholds are not met.
- **Artifact evidence** — every eval must result in a machine-readable report.

---

## Eval Definitions

### M1: Audio Callback Latency
**File:** `evals/M1-audio-callback-latency.md`

```yaml
id: M1
name: Audio Callback Latency
type: capability
suite: latency
command: cargo bench --package sensorium-audio -- audio_callback_latency
gates:
  p99_latency_ms: "< 0.5"
  allocs_per_callback: 0
  panics: 0
pass_condition: pass@3 > 0.9
report_artifact: eval-reports/M1/report.json
```

#### Eval Code (Rust + Criterion)
```rust
// benches/audio_callback_latency.rs
use criterion::{criterion_group, criterion_main, Criterion};

fn benchmark_audio_callback(c: &mut Criterion) {
    let mut plugin = SensoriumPlugin::new(HostCallback::mock());
    let mut buffer = Buffer::with_capacity(512, 2);
    
    c.bench_function("audio_callback", |b| {
        b.iter(|| {
            plugin.process(&mut buffer, &mut Aux::mock(), &mut Ctx::mock());
        })
    });
}

criterion_group!(benches, benchmark_audio_callback);
criterion_main!(benches);
```

---

### M2: Contract Generation
**File:** `evals/M2-contract-generation.md`

```yaml
id: M2
name: Contract Generation
type: capability
suite: contract
gates:
  protobuf_compile: 0 failures
  openapi_validate: 0 diffs
  automerge_sync_ms: "< 5"
pass_condition: pass@3 > 0.9
report_artifact: eval-reports/M2/report.json
```

#### Eval Script
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== M2 Contract Generation ==="
report_dir="eval-reports/M2"
mkdir -p "$report_dir"

results=()

# Protobuf → Rust
if cargo build --package sensorium-audio 2>&1 | grep -q "error"; then
  results+=('{"test":"protobuf_rust","status":"fail"}')
else
  results+=('{"test":"protobuf_rust","status":"pass"}')
fi

# OpenAPI → TypeScript
if ! npm run generate:types 2>&1 | grep -q "error"; then
  results+=('{"test":"openapi_ts","status":"pass"}')
else
  results+=('{"test":"openapi_ts","status":"fail"}')
fi

# Automerge sync latency
sync_ms=$(cargo test --package sensorium-sync -- sync_roundtrip --quiet 2>/dev/null || echo 9999)
if (( $(echo "$sync_ms < 5" | bc -l) )); then
  results+=('{"test":"automerge_sync","status":"pass","latency_ms":'$sync_ms'}')
else
  results+=('{"test":"automerge_sync","status":"fail","latency_ms":'$sync_ms'}')
fi

# Write JSON report
printf '[%s]\n' "$(IFS=','; echo "${results[*]}")" > "$report_dir/report.json"
```

---

### M3: Health Prediction Accuracy
**File:** `evals/M3-health-prediction.md`

```yaml
id: M3
name: Health Prediction Accuracy
type: capability
suite: observability
command: python -m evals.run_health_prediction
gates:
  precision: "> 0.8"
  recall: "> 0.7"
pass_condition: pass@3 > 0.9
report_artifact: eval-reports/M3/report.json
```

---

## Eval Runner Implementation

**File:** `hooks/eval-runner.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-capability}"
EVAL="${2:-M1}"
EVAL_DIR="evals"
REPORT_DIR="eval-reports/${EVAL}"
METRICS_FILE="${REPORT_DIR}/metrics.json"

mkdir -p "$REPORT_DIR"

# Load eval definition
EVAL_FILE="${EVAL_DIR}/${EVAL}-*.md"
if [ ! -f "$EVAL_FILE" ]; then
  echo "Eval definition not found: $EVAL_FILE"
  exit 1
fi

# Parse YAML frontmatter (simple grep for demo)
CMD=$(grep -A5 '^command:' "$EVAL_FILE" | grep -v '^--' | tail -1 | sed 's/^ *//')

echo "Running $EVAL in mode: $MODE"
echo "Command: $CMD"

# Run with timeout
if timeout 120 bash -c "$CMD"; then
  STATUS="pass"
else
  STATUS="fail"
fi

# Extract metrics (simplified)
cat > "$METRICS_FILE" <<EOF
{
  "eval": "$EVAL",
  "mode": "$MODE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$STATUS",
  "artifact": "$REPORT_DIR/report.json"
}
EOF

echo "Eval $EVAL $MODE: $STATUS"
echo "Report: $METRICS_FILE"

# Fail if capability mode and status is fail
if [ "$MODE" = "capability" ] && [ "$STATUS" = "fail" ]; then
  exit 1
fi
```

Make it executable:
```bash
chmod +x hooks/eval-runner.sh
```

---

## CI Integration

```yaml
# .github/workflows/eval.yml
name: Eval Driven Dev

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            target
          key: ${{ runner.os }}-eval-${{ hashFiles('**/Cargo.lock') }}
      - run: bash hooks/eval-runner.sh capability M1
      - run: bash hooks/eval-runner.sh regression M1
      - run: bash hooks/eval-runner.sh report M1
      - uses: actions/upload-artifact@v4
        with:
          name: eval-reports
          path: eval-reports/
```

---

## Rate-Limit & Resource Guardrails

### Rule #4 Implementation
```yaml
# Never run cargo build parallel with eval benchmarks
strategy:
  matrix:
    job: [build, test, eval]
  # Run serially to avoid OOM on CI runners
```

### Local Execution
```bash
# Serialize heavy Rust builds
cargo check --workspace  # first
cargo bench              # separate terminal, after build cache warm
```

---

## Report Template
```
EVAL-DRIVEN DEVELOPMENT REPORT
===============================
Eval:    [M1/M2/M3/...]
Mode:    [capability / regression / report]
Status:  [PASS/FAIL]
Pass@3:  [X %] (target: > 90%)
Pass^3:  [X %] (target: 100% for regression)
Report:  eval-reports/M1/report.json
```

---