#!/usr/bin/env bash
set -euo pipefail

# Agent: local-ai
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/local-ai"
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
    echo "🔨 Building local-ai (llamafile, candle RAVE/DDSP)..." >&2
    run_phase "cargo build" cargo build --package sensorium-ai --release --features "candle,metal,webgpu" \
      || recover 1 "Build failed" "Re-run with task=build after fixing compilation errors" "Stop on build failure"
    # llamafile is a single binary - download/verify if needed
    if [ ! -f "${WORK_DIR}/llamafile-llama3.1-8b-q4_k_m" ]; then
      echo "📥 Downloading llamafile..." >&2
      curl -L -o "${WORK_DIR}/llamafile-llama3.1-8b-q4_k_m" \
        "https://github.com/Mozilla-Ocho/llamafile/releases/download/0.8.0/llamafile-llama3.1-8b-q4_k_m" \
        || recover 1 "llamafile download failed" "Check network, then re-run task=build" "Stop on download failure"
      chmod +x "${WORK_DIR}/llamafile-llama3.1-8b-q4_k_m"
    fi
    emit_json "success" "Local-ai build completed (candle + llamafile)" '["verify", "test"]' "[\"target/release/libsensorium_ai.dylib\", \"${WORK_DIR}/llamafile-llama3.1-8b-q4_k_m\"]"
    ;;
  verify)
    echo "🔍 Verifying local-ai (llamafile first token <500ms, RAVE <10ms)..." >&2
    run_phase "clippy" cargo clippy --package sensorium-ai -- -D warnings \
      || recover 2 "Clippy warnings" "Fix warnings, then re-run task=verify" "Continue on warning"
    run_phase "test" cargo test --package sensorium-ai \
      || recover 3 "Tests failed" "Fix failing tests, then re-run task=verify" "Stop on test failure"
    # llamafile smoke test
    run_phase "llamafile smoke" timeout 10s "${WORK_DIR}/llamafile-llama3.1-8b-q4_k_m" -p "Hello" -n 1 \
      || recover 4 "llamafile smoke test failed" "Check llamafile binary, then re-run task=verify" "Stop on llamafile failure"
    emit_json "success" "Local-ai verification passed" '["bench"]' "[\"test-results.xml\", \"llamafile-smoke.log\"]"
    ;;
  bench)
    echo "📊 Benchmarking local-ai (llamafile first token, RAVE interpolation)..." >&2
    run_phase "bench" cargo bench --package sensorium-ai -- --save-baseline main \
      || recover 5 "Benchmark failed" "Check benchmark code, then re-run task=bench" "Continue on bench failure"
    FIRST_TOKEN=$(cargo bench --package sensorium-ai --bench llamafile -- --format=terse 2>/dev/null | grep "first_token" | awk '{print $2}' | head -1 || echo "9999")
    RAVE_INTERP=$(cargo bench --package sensorium-ai --bench rave -- --format=terse 2>/dev/null | grep "interpolate" | awk '{print $2}' | head -1 || echo "999")
    echo "First token: ${FIRST_TOKEN}ms (limit: 500ms)" >&2
    echo "RAVE interp: ${RAVE_INTERP}ms (limit: 10ms)" >&2
    if (( $(echo "${FIRST_TOKEN} > 500" | bc -l 2>/dev/null || echo 1) )) || (( $(echo "${RAVE_INTERP} > 10" | bc -l 2>/dev/null || echo 1) )); then
      recover 6 "Latency budget exceeded (First token: ${FIRST_TOKEN}ms, RAVE: ${RAVE_INTERP}ms)" "Optimize model/quantization, then re-run task=bench" "Stop on budget violation"
    fi
    emit_json "success" "Local-ai latency budgets met (First: ${FIRST_TOKEN}ms, RAVE: ${RAVE_INTERP}ms)" '["report"]' "[\"target/criterion/report/index.html\"]"
    ;;
  test)
    echo "🧪 Running local-ai test suite..." >&2
    run_phase "test" cargo test --package sensorium-ai -- --nocapture \
      || recover 7 "Test suite failed" "Fix failing tests, then re-run task=test" "Stop on test failure"
    emit_json "success" "Local-ai tests passed" '[]' "[\"test-results.xml\"]"
    ;;
  function_calling)
    echo "📞 Testing function calling interface..." >&2
    run_phase "function_calling" cargo test --package sensorium-ai --test function_calling -- --nocapture \
      || recover 8 "Function calling tests failed" "Check function schemas, then re-run task=function_calling" "Stop on function calling failure"
    emit_json "success" "Function calling tests passed" '[]' "[\"function-calling-results.xml\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {build,verify,bench,test,function_calling}" "Stop on invalid task"
    ;;
esac

exit 0