#!/usr/bin/env bash
set -euo pipefail

# Agent: formal-verification
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/formal-verification"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"
REPORT_DIR="${BASE_DIR}/reports/verification"
mkdir -p "${REPORT_DIR}"

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
task="$(echo "${input}" | jq -r '.task // "all"')"
params="$(echo "${input}" | jq -c '.params // {}')"
context="$(echo "${input}" | jq -c '.context // {}')"

TS=$(date -u +%Y%m%d-%H%M%S)
REPORT_FILE="${REPORT_DIR}/${TS}.json"

run_kani() {
  local pkg="$1"
  echo "🔬 Running Kani on ${pkg}..." >&2
  cargo kani --package "${pkg}" 2>&1 | tee "${WORK_DIR}/kani-${pkg}-${TS}.log"
}

run_prusti() {
  local pkg="$1"
  echo "🔬 Running Prusti on ${pkg}..." >&2
  cargo prusti --package "${pkg}" 2>&1 | tee "${WORK_DIR}/prusti-${pkg}-${TS}.log"
}

run_creusot() {
  local pkg="$1"
  echo "🔬 Running Creusot on ${pkg}..." >&2
  cargo creusot --package "${pkg}" 2>&1 | tee "${WORK_DIR}/creusot-${pkg}-${TS}.log"
}

run_proptest() {
  local pkg="$1"
  echo "🔬 Running Property Tests on ${pkg}..." >&2
  cargo test --package "${pkg}" --test property -- --nocapture 2>&1 | tee "${WORK_DIR}/proptest-${pkg}-${TS}.log"
}

case "${task}" in
  all)
    echo "🛡️  Running full formal verification suite..." >&2
    run_phase "kani-audio" run_kani sensorium-audio \
      || recover 1 "Kani audio failed" "Fix proofs, then re-run task=all" "Stop on Kani failure"
    run_phase "kani-midi" run_kani sensorium-midi \
      || recover 2 "Kani midi failed" "Fix proofs, then re-run task=all" "Stop on Kani failure"
    run_phase "kani-sync" run_kani sensorium-sync \
      || recover 3 "Kani sync failed" "Fix proofs, then re-run task=all" "Stop on Kani failure"
    run_phase "kani-visual" run_kani sensorium-visual \
      || recover 4 "Kani visual failed" "Fix proofs, then re-run task=all" "Stop on Kani failure"
    run_phase "kani-ai" run_kani sensorium-ai \
      || recover 5 "Kani ai failed" "Fix proofs, then re-run task=all" "Stop on Kani failure"
    run_phase "prusti" run_prusti sensorium-dsp \
      || recover 6 "Prusti failed" "Fix deductive proofs, then re-run task=all" "Stop on Prusti failure"
    run_phase "creusot" run_creusot sensorium-dsp \
      || recover 7 "Creusot failed" "Fix Coq proofs, then re-run task=all" "Stop on Creusot failure"
    run_phase "proptest" run_proptest sensorium-sync \
      || recover 8 "Property tests failed" "Fix property violations, then re-run task=all" "Stop on property failure"
    
    # Generate summary report
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "completed",
  "packages_verified": ["sensorium-audio", "sensorium-midi", "sensorium-sync", "sensorium-visual", "sensorium-ai", "sensorium-dsp"],
  "tools": ["kani", "prusti", "creusot", "proptest"],
  "hot_paths_covered": true
}
EOF
    emit_json "success" "Full formal verification completed" '["report"]' "[\"${REPORT_FILE}\", \"${WORK_DIR}/kani-*.log\", \"${WORK_DIR}/prusti-*.log\", \"${WORK_DIR}/creusot-*.log\", \"${WORK_DIR}/proptest-*.log\"]"
    ;;
  kani)
    echo "🔬 Running Kani model checking on all packages..." >&2
    for pkg in sensorium-audio sensorium-midi sensorium-sync sensorium-visual sensorium-ai; do
      run_phase "kani-${pkg}" run_kani "${pkg}" \
        || recover 10 "Kani ${pkg} failed" "Fix proofs for ${pkg}, then re-run task=kani" "Stop on Kani failure"
    done
    emit_json "success" "Kani model checking completed for all packages" '["report"]' "[\"${WORK_DIR}/kani-*-${TS}.log\"]"
    ;;
  prusti)
    echo "🔬 Running Prusti deductive verification..." >&2
    run_phase "prusti" run_prusti sensorium-dsp \
      || recover 11 "Prusti failed" "Fix deductive proofs, then re-run task=prusti" "Stop on Prusti failure"
    emit_json "success" "Prusti verification completed" '["report"]' "[\"${WORK_DIR}/prusti-*-${TS}.log\"]"
    ;;
  creusot)
    echo "🔬 Running Creusot Coq proofs..." >&2
    run_phase "creusot" run_creusot sensorium-dsp \
      || recover 12 "Creusot failed" "Fix Coq proofs, then re-run task=creusot" "Stop on Creusot failure"
    emit_json "success" "Creusot proofs completed" '["report"]' "[\"${WORK_DIR}/creusot-*-${TS}.log\"]"
    ;;
  proptest)
    echo "🔬 Running Property-based tests..." >&2
    for pkg in sensorium-audio sensorium-midi sensorium-sync sensorium-visual sensorium-ai; do
      run_phase "proptest-${pkg}" run_proptest "${pkg}" \
        || recover 13 "Property tests ${pkg} failed" "Fix property violations for ${pkg}, then re-run task=proptest" "Stop on property failure"
    done
    emit_json "success" "Property-based tests completed for all packages" '["report"]' "[\"${WORK_DIR}/proptest-*-${TS}.log\"]"
    ;;
  coverage)
    echo "📊 Generating verification coverage report..." >&2
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "coverage_report",
  "hot_path_functions": $(cargo kani --package sensorium-audio --list 2>/dev/null | grep -c "fn " || echo 0),
  "verified_functions": 0,
  "coverage_percent": 0
}
EOF
    emit_json "success" "Verification coverage report generated" '[]' "[\"${REPORT_FILE}\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {all,kani,prusti,creusot,proptest,coverage}" "Stop on invalid task"
    ;;
esac

exit 0