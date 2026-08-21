#!/usr/bin/env bash
set -euo pipefail

GATE="${1:?Usage: ci-gate-checks.sh <M1|M2|M3|M4|M5|M6|M7>}"
echo "🚦 Running CI Gate Checks for ${GATE}"

case "$GATE" in
  M1)
    echo "Gate M1: Zero-Latency Core"
    cargo kani --package sensorium-audio
    cargo test --package sensorium-midi -- webtransport_integration
    ;;
  M2)
    echo "Gate M2: Type-Safe Contracts"
    ./hooks/eval-runner.sh M2 capability
    ./hooks/eval-runner.sh M2 regression
    ;;
  M3)
    echo "Gate M3: Self-Healing Resilience"
    ./hooks/eval-runner.sh M3 capability
    ./hooks/eval-runner.sh M3 regression
    ;;
  M4)
    echo "Gate M4: Resource-Optimal Scaling"
    cargo bench --package sensorium-audio -- fft_benchmark
    cargo bench --package sensorium-visual -- instanced_rendering
    ;;
  M5)
    echo "Gate M5: Developer Velocity"
    ./hooks/eval-runner.sh M5 capability
    ./hooks/eval-runner.sh M5 regression
    ;;
  M6)
    echo "Gate M6: Live Performance Features"
    ./hooks/eval-runner.sh M6 capability
    ./hooks/eval-runner.sh M6 regression
    ;;
  M7)
    echo "Gate M7: Production Hardening"
    ./hooks/eval-runner.sh M7 capability
    ./hooks/eval-runner.sh M7 regression
    cargo audit
    cargo deny check
    ;;
  *)
    echo "Unknown gate: $GATE"
    exit 1
    ;;
esac

echo "✅ Gate ${GATE} Checks Passed"
exit 0