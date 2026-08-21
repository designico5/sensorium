#!/usr/bin/env bash
set -euo pipefail

# Agent: midi-2.0
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/midi-2.0"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"

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
    echo "🔨 Building midi-2.0 (UMP parser, WebTransport/QUIC)..." >&2
    run_phase "cargo build" cargo build --package sensorium-midi --release --features "webtransport,quic" \
      || recover 1 "Build failed" "Re-run with task=build after fixing compilation errors" "Stop on build failure"
    emit_json "success" "MIDI 2.0 build completed" '["verify", "test"]' "[\"target/release/libsensorium_midi.dylib\"]"
    ;;
  verify)
    echo "🔍 Verifying midi-2.0 (UMP Parse <10µs, 0-RTT Reconnect)..." >&2
    run_phase "kani" cargo kani --package sensorium-midi --harness ump_parse \
      || recover 2 "Kani proof failed (UMP Parse)" "Fix proof failures, then re-run task=verify" "Stop on proof failure"
    run_phase "clippy" cargo clippy --package sensorium-midi -- -D warnings \
      || recover 3 "Clippy warnings" "Fix warnings, then re-run task=verify" "Continue on warning"
    run_phase "test" cargo test --package sensorium-midi \
      || recover 4 "Tests failed" "Fix failing tests, then re-run task=verify" "Stop on test failure"
    emit_json "success" "MIDI 2.0 verification passed" '["bench"]' "[\"kani-proof.log\", \"test-results.xml\"]"
    ;;
  bench)
    echo "📊 Benchmarking midi-2.0 (UMP Parse+Route <10µs p99)..." >&2
    run_phase "bench" cargo bench --package sensorium-midi -- --save-baseline main \
      || recover 5 "Benchmark failed" "Check benchmark code, then re-run task=bench" "Continue on bench failure"
    MIDI_P99=$(cargo bench --package sensorium-midi -- --format=terse 2>/dev/null | grep "p99" | awk '{print $2}' | head -1 || echo "999999")
    echo "MIDI P99: ${MIDI_P99}µs (limit: 10µs)" >&2
    if (( MIDI_P99 > 10 )); then
      recover 6 "P99 latency ${MIDI_P99}µs exceeds 10µs budget" "Optimize UMP parser, then re-run task=bench" "Stop on budget violation"
    fi
    emit_json "success" "MIDI 2.0 P99=${MIDI_P99}µs within budget" '["report"]' "[\"target/criterion/report/index.html\"]"
    ;;
  test)
    echo "🧪 Running midi-2.0 test suite..." >&2
    run_phase "test" cargo test --package sensorium-midi -- --nocapture \
      || recover 7 "Test suite failed" "Fix failing tests, then re-run task=test" "Stop on test failure"
    emit_json "success" "MIDI 2.0 tests passed" '[]' "[\"test-results.xml\"]"
    ;;
  integration)
    echo "🔗 Running WebTransport/QUIC integration tests..." >&2
    run_phase "integration" cargo test --package sensorium-midi --test integration -- --nocapture \
      || recover 8 "Integration tests failed" "Check network setup, then re-run task=integration" "Stop on integration failure"
    emit_json "success" "MIDI 2.0 integration tests passed" '[]' "[\"integration-results.xml\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {build,verify,bench,test,integration}" "Stop on invalid task"
    ;;
esac

exit 0