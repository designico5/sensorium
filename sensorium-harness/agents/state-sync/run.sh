#!/usr/bin/env bash
set -euo pipefail

# Agent: state-sync
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/state-sync"
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
    echo "🔨 Building state-sync (Automerge 2.0 WASM, Yjs WebTransport)..." >&2
    run_phase "cargo build" cargo build --package sensorium-sync --release --features "automerge-wasm,yjs-webtransport" \
      || recover 1 "Build failed" "Re-run with task=build after fixing compilation errors" "Stop on build failure"
    run_phase "wasm build" wasm-pack build --target web --out-dir "${WORK_DIR}/pkg" "${BASE_DIR}/packages/sync-wasm" \
      || recover 1 "WASM build failed" "Check wasm-pack setup, then re-run task=build" "Stop on WASM failure"
    emit_json "success" "State-sync build completed (Rust + WASM)" '["verify", "test"]' "[\"target/release/libsensorium_sync.dylib\", \"${WORK_DIR}/pkg\"]"
    ;;
  verify)
    echo "🔍 Verifying state-sync (Automerge Sync <5ms, CRDT Property Tests)..." >&2
    run_phase "kani" cargo kani --package sensorium-sync --harness automerge_merge \
      || recover 2 "Kani proof failed (Automerge merge)" "Fix proof failures, then re-run task=verify" "Stop on proof failure"
    run_phase "proptest" cargo test --package sensorium-sync --test property -- --nocapture \
      || recover 3 "Property tests failed (CRDT merge)" "Fix property violations, then re-run task=verify" "Stop on property failure"
    run_phase "clippy" cargo clippy --package sensorium-sync -- -D warnings \
      || recover 4 "Clippy warnings" "Fix warnings, then re-run task=verify" "Continue on warning"
    run_phase "test" cargo test --package sensorium-sync \
      || recover 5 "Tests failed" "Fix failing tests, then re-run task=verify" "Stop on test failure"
    emit_json "success" "State-sync verification passed" '["bench"]' "[\"kani-proof.log\", \"proptest-results.xml\", \"test-results.xml\"]"
    ;;
  bench)
    echo "📊 Benchmarking state-sync (Automerge Sync <5ms p99)..." >&2
    run_phase "bench" cargo bench --package sensorium-sync -- --save-baseline main \
      || recover 6 "Benchmark failed" "Check benchmark code, then re-run task=bench" "Continue on bench failure"
    SYNC_P99=$(cargo bench --package sensorium-sync -- --format=terse 2>/dev/null | grep "p99" | awk '{print $2}' | head -1 || echo "9999")
    echo "Sync P99: ${SYNC_P99}ms (limit: 5ms)" >&2
    if (( $(echo "${SYNC_P99} > 5" | bc -l 2>/dev/null || echo 1) )); then
      recover 7 "P99 latency ${SYNC_P99}ms exceeds 5ms budget" "Optimize sync path, then re-run task=bench" "Stop on budget violation"
    fi
    emit_json "success" "State-sync P99=${SYNC_P99}ms within budget" '["report"]' "[\"target/criterion/report/index.html\"]"
    ;;
  test)
    echo "🧪 Running state-sync test suite..." >&2
    run_phase "test" cargo test --package sensorium-sync -- --nocapture \
      || recover 8 "Test suite failed" "Fix failing tests, then re-run task=test" "Stop on test failure"
    emit_json "success" "State-sync tests passed" '[]' "[\"test-results.xml\"]"
    ;;
  offline)
    echo "📴 Running offline-first edit sync tests..." >&2
    run_phase "offline" cargo test --package sensorium-sync --test offline -- --nocapture \
      || recover 9 "Offline sync tests failed" "Check offline logic, then re-run task=offline" "Stop on offline failure"
    emit_json "success" "Offline-first sync tests passed" '[]' "[\"offline-results.xml\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {build,verify,bench,test,offline}" "Stop on invalid task"
    ;;
esac

exit 0