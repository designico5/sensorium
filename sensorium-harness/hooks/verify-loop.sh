#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-all}"  # all | build | type | lint | test | security | diff
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${BASE_DIR}/reports/verify"
mkdir -p "${REPORT_DIR}"

ts=$(date -u +%Y%m%d-%H%M%S)
report="${REPORT_DIR}/${ts}.txt"

run_phase() {
  local name="$1"; shift
  echo "[${name}]"
  if "$@"; then
    echo "  PASS"
  else
    echo "  FAIL"
  fi
}

{
  echo "VERIFICATION REPORT"
  echo "=================="
  echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Mode: ${MODE}"
  echo

  case "$MODE" in
    all)
      run_phase "build" bash "${BASE_DIR}/hooks/pre-commit-verification.sh"
      run_phase "eval" bash "${BASE_DIR}/hooks/eval-runner.sh" M1 report
      run_phase "benchmark" bash "${BASE_DIR}/hooks/post-merge-benchmark.sh"
      ;;
    build) run_phase "build" bash "${BASE_DIR}/hooks/pre-commit-verification.sh" ;;
    eval) run_phase "eval" bash "${BASE_DIR}/hooks/eval-runner.sh" M1 report ;;
    benchmark) run_phase "benchmark" bash "${BASE_DIR}/hooks/post-merge-benchmark.sh" ;;
  esac
} | tee "$report"

echo
echo "Report: $report"