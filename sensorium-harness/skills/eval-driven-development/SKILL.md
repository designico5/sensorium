---
name: eval-driven-development
description: Use when defining pass@k evals before implementation, measuring agent reliability, and creating regression test suites for all 7 gates (M1-M7)
---

# Eval-Driven Development

## Overview
Eval-Driven Development (EDD) treats evaluations as the "unit tests of AI development". Define capability evals BEFORE implementation, run continuously during development, track regressions with pass@k metrics. Each of the 7 gates (M1-M7) has capability + regression eval suites.

## When to Use
- Starting any new feature or phase
- Need measurable reliability (pass@3 > 90% capability, pass^3 = 100% regression)
- Want to catch regressions automatically
- Parallel agent work needs shared success criteria
- Formal gates require evidence

## Core Pattern

### Eval Definition Structure (Per Gate)
```markdown
# .claude/evals/M1-audio-callback-latency.md

## EVAL DEFINITION: M1 Audio Callback Latency

### Capability Evals (Target: pass@3 = 100%)
1. **Audio P99 < 0.5ms**
   - Task: Run criterion benchmark on audio callback
   - Success: p99 latency < 500µs over 10000 iterations
   - Grader: Code-based (criterion JSON output)
   
2. **MIDI Parse + Route < 10µs**
   - Task: Benchmark UMP parser with 1000 packets
   - Success: p99 < 10µs per packet
   - Grader: Code-based

3. **VST3/CLAP/Standalone Build**
   - Task: `cargo build --release --features vst3,clap,standalone,vizia`
   - Success: All 4 targets produce valid binaries
   - Grader: Code-based (binary validation)

4. **Kani Proof: No-Panic + No-Alloc**
   - Task: `cargo kani --package sensorium-audio`
   - Success: All proofs pass
   - Grader: Code-based (Kani exit code)

5. **WebTransport 0-RTT Reconnect < 50ms**
   - Task: Simulate disconnect/reconnect cycle
   - Success: Reconnection < 50ms (0-RTT)
   - Grader: Code-based (timestamp diff)

### Regression Evals (Target: pass^3 = 100%)
- All capability evals from previous gates must still pass
- Run full test suite: `cargo test --workspace`
- Verify no new warnings: `cargo clippy --workspace -D warnings`

### Success Metrics
- pass@3 >= 90% for capability evals
- pass^3 = 100% for regression evals
```

### Eval Runner (Hook)
```bash
#!/bin/bash
# hooks/eval-runner.sh

GATE=$1
MODE=$2  # capability | regression | report

EVAL_DIR=".claude/evals"
REPORT_DIR="eval-reports/$GATE"

run_capability() {
    local eval_file="$EVAL_DIR/$GATE-*.md"
    # Parse eval file, extract capability evals
    # Run each with code-based grader
    # Track pass@k
}

run_regression() {
    # Run all previous gate evals
    # Verify pass^3 = 100%
}

generate_report() {
    cat > "$REPORT_DIR/report.md" <<EOF
EVAL REPORT: $GATE
==================

Capability Evals:
$(run_capability | format_results)

Regression Evals:
$(run_regression | format_results)

Metrics:
  pass@1: XX%
  pass@3: XX%
  pass^3: XX%

Status: $(if [ $pass3 -ge 90 ] && [ $pass3_regression -eq 100 ]; then echo "READY"; else echo "NOT READY"; fi)
EOF
}

case $MODE in
    capability) run_capability ;;
    regression) run_regression ;;
    report) generate_report ;;
esac
```

### Pass@k Tracking
```rust
struct EvalMetrics {
    gate: String,
    capability_results: Vec<Vec<bool>>,
    regression_results: Vec<Vec<bool>>,
}

impl EvalMetrics {
    fn pass_at_k(&self, k: usize) -> f64 {
        let passed: usize = self.capability_results.iter()
            .filter(|attempts| attempts.iter().take(k).any(|&v| v))
            .count();
        passed as f64 / self.capability_results.len() as f64
    }
    
    fn pass_k(&self, k: usize) -> f64 {
        let passed: usize = self.regression_results.iter()
            .filter(|attempts| attempts.iter().take(k).all(|&v| v))
            .count();
        passed as f64 / self.regression_results.len() as f64
    }
}
```

### CI Integration
```yaml
# .github/workflows/eval.yml
name: Eval Gate
on:
  workflow_dispatch:
    inputs:
      gate:
        type: choice
        options: [M1, M2, M3, M4, M5, M6, M7]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Capability Evals
        run: ./hooks/eval-runner.sh ${{ github.event.inputs.gate }} capability
      - name: Run Regression Evals
        run: ./hooks/eval-runner.sh ${{ github.event.inputs.gate }} regression
      - name: Generate Report
        run: ./hooks/eval-runner.sh ${{ github.event.inputs.gate }} report
      - name: Pass/Fail Gate
        run: |
          PASS_AT_3=$(cat eval-reports/${{ github.event.inputs.gate }}/metrics.json | jq '.pass_at_3')
          PASS_K=$(cat eval-reports/${{ github.event.inputs.gate }}/metrics.json | jq '.pass_k')
          if (( $(echo "$PASS_AT_3 < 0.9" | bc -l) )); then exit 1; fi
          if (( $(echo "$PASS_K < 1.0" | bc -l) )); then exit 1; fi
```

## Verification Commands
```bash
./hooks/eval-runner.sh M1 capability
./hooks/eval-runner.sh M1 regression
./hooks/eval-runner.sh M1 report
cat eval-reports/M1/report.md
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Writing evals after implementation | Define evals FIRST (TDD for AI) |
| Using only model graders | Prefer code-based graders (deterministic) |
| Not tracking pass@k over time | Store metrics in `eval-reports/*/metrics.json` |
| Skipping regression evals | Every gate runs ALL previous gate evals |
| Slow evals (>5 min) | Keep evals fast; parallelize; cache |

## Real-World Impact
- **Gate M1-M7**: Each has capability + regression evals
- **pass@3 > 90%**: Capability reliability target
- **pass^3 = 100%**: Regression reliability target
- **Code-based graders**: Deterministic, fast, CI-friendly
- **Automated gates**: Block merge if evals fail