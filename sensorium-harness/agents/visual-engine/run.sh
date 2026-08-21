#!/usr/bin/env bash
set -euo pipefail

# Agent: visual-engine
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/visual-engine"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"

emit_json() {
  local status="$1" summary="$2" next_actions="$3" artifacts="$4"
  cat <<EOF
{
  "status": "${status}",
  "summary": "${summary}",
  "next_actions": ${next_actions},
  "artifacts": ${artifacts}
}
EOF
}

recover() {
  local code=$1 hint=$2 retry=$3 stop=$4
  emit_json "error" "${hint}" "[\"${retry}\"]" "[\"${WORK_DIR}/error-${code}.log\"]"
  exit "${code}"
}

run_phase() {
  local name="$1"; shift
  echo "[${name}]" >&2
  if "$@"; then
    echo "  PASS" >&2
  else
    echo "  FAIL" >&2
    return 1
  fi
}

input="$(cat)"
task="$(echo "${input}" | jq -r '.task // "build"')"
params="$(echo "${input}" | jq -c '.params // {}')"
context="$(echo "${input}" | jq -c '.context // {}')"

case "${task}" in
  build)
    echo "🔨 Building visual-engine (wgpu compute shaders, instanced rendering)..." >&2
    run_phase "cargo build" cargo build --package sensorium-visual --release --features "wgpu,compute" \
      || recover 1 "Build failed" "Re-run with task=build after fixing compilation errors" "Stop on build failure"
    run_phase "shader build" cargo build --package sensorium-visual-shaders --release \
      || recover 1 "Shader build failed" "Check shader code, then re-run task=build" "Stop on shader failure"
    emit_json "success" "Visual-engine build completed" '["verify", "test"]' "[\"target/release/libsensorium_visual.dylib\", \"target/release/shaders\"]"
    ;;
  verify)
    echo "🔍 Verifying visual-engine (FFT <0.1ms GPU, 10k nodes @60fps)..." >&2
    run_phase "clippy" cargo clippy --package sensorium-visual -- -D warnings \
      || recover 2 "Clippy warnings" "Fix warnings, then re-run task=verify" "Continue on warning"
    run_phase "test" cargo test --package sensorium-visual \
      || recover 3 "Tests failed" "Fix failing tests, then re-run task=verify" "Stop on test failure"
    run_phase "shader validate" cargo test --package sensorium-visual-shaders \
      || recover 4 "Shader validation failed" "Fix shader errors, then re-run task=verify" "Stop on shader failure"
    emit_json "success" "Visual-engine verification passed" '["bench"]' "[\"test-results.xml\", \"shader-validation.log\"]"
    ;;
  bench)
    echo "📊 Benchmarking visual-engine (FFT 4096 <0.1ms, 10k nodes <2ms)..." >&2
    run_phase "bench" cargo bench --package sensorium-visual -- --save-baseline main \
      || recover 5 "Benchmark failed" "Check benchmark code, then re-run task=bench" "Continue on bench failure"
    FFT_GPU=$(cargo bench --package sensorium-visual --bench fft -- --format=terse 2>/dev/null | grep "p99" | awk '{print $2}' | head -1 || echo "999")
    NODES_GPU=$(cargo bench --package sensorium-visual --bench instanced -- --format=terse 2>/dev/null | grep "p99" | awk '{print $2}' | head -1 || echo "999")
    echo "FFT 4096 GPU: ${FFT_GPU}ms (limit: 0.1ms)" >&2
    echo "10k Nodes GPU: ${NODES_GPU}ms (limit: 2ms)" >&2
    if (( $(echo "${FFT_GPU} > 0.1" | bc -l 2>/dev/null || echo 1) )) || (( $(echo "${NODES_GPU} > 2" | bc -l 2>/dev/null || echo 1) )); then
      recover 6 "GPU budget exceeded (FFT: ${FFT_GPU}ms, Nodes: ${NODES_GPU}ms)" "Optimize shaders/pipeline, then re-run task=bench" "Stop on budget violation"
    fi
    emit_json "success" "Visual-engine GPU budgets met (FFT: ${FFT_GPU}ms, Nodes: ${NODES_GPU}ms)" '["report"]' "[\"target/criterion/report/index.html\"]"
    ;;
  test)
    echo "🧪 Running visual-engine test suite..." >&2
    run_phase "test" cargo test --package sensorium-visual -- --nocapture \
      || recover 7 "Test suite failed" "Fix failing tests, then re-run task=test" "Stop on test failure"
    emit_json "success" "Visual-engine tests passed" '[]' "[\"test-results.xml\"]"
    ;;
  dualscreen)
    echo "🖥️  Testing dual-screen rendering..." >&2
    run_phase "dualscreen" cargo test --package sensorium-visual --test dualscreen -- --nocapture \
      || recover 8 "Dual-screen tests failed" "Check screen sync, then re-run task=dualscreen" "Stop on dualscreen failure"
    emit_json "success" "Dual-screen rendering tests passed" '[]' "[\"dualscreen-results.xml\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {build,verify,bench,test,dualscreen}" "Stop on invalid task"
    ;;
esac

exit 0