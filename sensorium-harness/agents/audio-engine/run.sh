#!/usr/bin/env bash
set -euo pipefail

# Agent: audio-engine
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/audio-engine"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"

# --- JSON Helpers ---
json_escape() { sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n'; }
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

# --- Recovery Contract ---
recover() {
  local code=$1 hint=$2 retry=$3 stop=$4
  emit_json "error" "${hint}" "[\"${retry}\"]" "[\"${WORK_DIR}/error-${code}.log\"]"
  exit "${code}"
}

# --- Read Input ---
input="$(cat)"
task="$(echo "${input}" | jq -r '.task // "build"')"
params="$(echo "${input}" | jq -c '.params // {}')"
context="$(echo "${input}" | jq -c '.context // {}')"

# --- Task Dispatch ---
case "${task}" in
  build)
    echo "🔨 Building audio-engine (nih-plug vst3/clap/standalone/vizia)..." >&2
    run_phase "cargo build" cargo build --package sensorium-audio --release --features "vst3,clap,standalone,vizia" \
      || recover 1 "Build failed" "Re-run with task=build after fixing compilation errors" "Stop on build failure"
    emit_json "success" "Audio-engine build completed" '["verify", "test"]' "[\"target/release/libsensorium_audio.dylib\", \"target/release/sensorium-audio.vst3\"]"
    ;;
  verify)
    echo "🔍 Verifying audio-engine (Kani + Clippy + Tests)..." >&2
    run_phase "kani" cargo kani --package sensorium-audio --harness audio_callback \
      || recover 2 "Kani proof failed (No-Panic/No-Alloc)" "Fix proof failures, then re-run task=verify" "Stop on proof failure"
    run_phase "clippy" cargo clippy --package sensorium-audio -- -D warnings \
      || recover 3 "Clippy warnings" "Fix warnings, then re-run task=verify" "Continue on warning"
    run_phase "test" cargo test --package sensorium-audio \
      || recover 4 "Tests failed" "Fix failing tests, then re-run task=verify" "Stop on test failure"
    emit_json "success" "Audio-engine verification passed" '["bench"]' "[\"kani-proof.log\", \"test-results.xml\"]"
    ;;
  bench)
    echo "📊 Benchmarking audio-engine (Criterion P99 < 0.5ms)..." >&2
    run_phase "bench" cargo bench --package sensorium-audio -- --save-baseline main \
      || recover 5 "Benchmark failed" "Check benchmark code, then re-run task=bench" "Continue on bench failure"
    AUDIO_P99=$(cargo bench --package sensorium-audio -- --format=terse 2>/dev/null | grep "p99" | awk '{print $2}' | head -1 || echo "999")
    echo "Audio P99: ${AUDIO_P99}ms (limit: 0.5ms)" >&2
    if (( $(echo "${AUDIO_P99} > 0.5" | bc -l 2>/dev/null || echo 1) )); then
      recover 6 "P99 latency ${AUDIO_P99}ms exceeds 0.5ms budget" "Optimize hot path, then re-run task=bench" "Stop on budget violation"
    fi
    emit_json "success" "Audio-engine P99=${AUDIO_P99}ms within budget" '["report"]' "[\"target/criterion/report/index.html\"]"
    ;;
  test)
    echo "🧪 Running audio-engine test suite..." >&2
    run_phase "test" cargo test --package sensorium-audio -- --nocapture \
      || recover 7 "Test suite failed" "Fix failing tests, then re-run task=test" "Stop on test failure"
    emit_json "success" "Audio-engine tests passed" '[]' "[\"test-results.xml\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {build,verify,bench,test}" "Stop on invalid task"
    ;;
esac

exit 0