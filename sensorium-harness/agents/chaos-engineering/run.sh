#!/usr/bin/env bash
set -euo pipefail

# Agent: chaos-engineering
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/chaos-engineering"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"
REPORT_DIR="${BASE_DIR}/reports/chaos"
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
task="$(echo "${input}" | jq -r '.task // "health"')"
params="$(echo "${input}" | jq -c '.params // {}')"
context="$(echo "${input}" | jq -c '.context // {}')"

TS=$(date -u +%Y%m%d-%H%M%S)
REPORT_FILE="${REPORT_DIR}/${TS}.json"

run_failure_injection() {
  local mode="$1"
  echo "💥 Injecting failure: ${mode}" >&2
  cargo run --package sensorium-chaos --failure "${mode}" 2>&1 | tee "${WORK_DIR}/chaos-${mode}-${TS}.log"
}

run_health_assess() {
  echo "🏥 Running health assessment (5 dimensions)..." >&2
  cargo run --package sensorium-chaos --health 2>&1 | tee "${WORK_DIR}/health-${TS}.log"
}

run_predictive_recovery() {
  echo "🔮 Running predictive recovery (Isolation Forest)..." >&2
  cargo run --package sensorium-chaos --predict 2>&1 | tee "${WORK_DIR}/predict-${TS}.log"
}

run_soak_test() {
  local duration="${1:-24h}"
  echo "⏱️  Running soak test for ${duration}..." >&2
  timeout "${duration}" cargo run --package sensorium-chaos --soak 2>&1 | tee "${WORK_DIR}/soak-${TS}.log"
}

case "${task}" in
  health)
    echo "🏥 Running health assessment..." >&2
    run_phase "health" run_health_assess \
      || recover 1 "Health assessment failed" "Check system state, then re-run task=health" "Stop on health failure"
    
    # Parse health score
    HEALTH_SCORE=$(grep -o '"score":[0-9.]*' "${WORK_DIR}/health-${TS}.log" | head -1 | cut -d: -f2 || echo "0")
    echo "Health Score: ${HEALTH_SCORE} (target: >0.8)" >&2
    if (( $(echo "${HEALTH_SCORE} < 0.8" | bc -l 2>/dev/null || echo 1) )); then
      recover 2 "Health score ${HEALTH_SCORE} below 0.8 threshold" "Investigate degraded components, then re-run task=health" "Stop on health threshold breach"
    fi
    emit_json "success" "Health score ${HEALTH_SCORE} meets threshold" '["report"]' "[\"${WORK_DIR}/health-${TS}.log\", \"${REPORT_FILE}\"]"
    ;;
  inject)
    local mode="${params}" # expects {"mode": "network_partition|memory_pressure|cpu_throttle|kill_sidecar"}
    mode=$(echo "${mode}" | jq -r '.mode // "network_partition"')
    echo "💥 Injecting failure mode: ${mode}..." >&2
    run_phase "inject-${mode}" run_failure_injection "${mode}" \
      || recover 3 "Failure injection ${mode} failed" "Check chaos framework, then re-run task=inject" "Stop on injection failure"
    emit_json "success" "Failure injection ${mode} completed" '["recovery"]' "[\"${WORK_DIR}/chaos-${mode}-${TS}.log\"]"
    ;;
  recovery)
    echo "🔄 Measuring MTTR for injected failures..." >&2
    run_phase "recovery" cargo run --package sensorium-chaos --recovery 2>&1 | tee "${WORK_DIR}/recovery-${TS}.log" \
      || recover 4 "Recovery measurement failed" "Check recovery logic, then re-run task=recovery" "Stop on recovery failure"
    
    MTTR_AUDIO=$(grep -o '"mttr_audio":[0-9]*' "${WORK_DIR}/recovery-${TS}.log" | cut -d: -f2 || echo "9999")
    MTTR_MIDI=$(grep -o '"mttr_midi":[0-9]*' "${WORK_DIR}/recovery-${TS}.log" | cut -d: -f2 || echo "9999")
    echo "MTTR Audio: ${MTTR_AUDIO}ms (limit: 500ms)" >&2
    echo "MTTR MIDI: ${MTTR_MIDI}ms (limit: 100ms)" >&2
    if (( MTTR_AUDIO > 500 )) || (( MTTR_MIDI > 100 )); then
      recover 5 "MTTR exceeds budget (Audio: ${MTTR_AUDIO}ms, MIDI: ${MTTR_MIDI}ms)" "Optimize recovery, then re-run task=recovery" "Stop on MTTR violation"
    fi
    emit_json "success" "MTTR within budgets (Audio: ${MTTR_AUDIO}ms, MIDI: ${MTTR_MIDI}ms)" '["report"]' "[\"${WORK_DIR}/recovery-${TS}.log\", \"${REPORT_FILE}\"]"
    ;;
  predict)
    echo "🔮 Running predictive failure detection..." >&2
    run_phase "predict" run_predictive_recovery \
      || recover 6 "Predictive recovery failed" "Check ML model, then re-run task=predict" "Stop on prediction failure"
    
    HORIZON=$(grep -o '"horizon_seconds":[0-9]*' "${WORK_DIR}/predict-${TS}.log" | cut -d: -f2 || echo "0")
    PRECISION=$(grep -o '"precision":[0-9.]*' "${WORK_DIR}/predict-${TS}.log" | cut -d: -f2 || echo "0")
    echo "Prediction Horizon: ${HORIZON}s (target: >30s)" >&2
    echo "Precision: ${PRECISION} (target: >0.8)" >&2
    if (( HORIZON < 30 )) || (( $(echo "${PRECISION} < 0.8" | bc -l 2>/dev/null || echo 1) )); then
      recover 7 "Prediction below threshold (Horizon: ${HORIZON}s, Precision: ${PRECISION})" "Retrain model, then re-run task=predict" "Stop on prediction threshold breach"
    fi
    emit_json "success" "Predictive recovery meets thresholds (Horizon: ${HORIZON}s, Precision: ${PRECISION})" '["report"]' "[\"${WORK_DIR}/predict-${TS}.log\", \"${REPORT_FILE}\"]"
    ;;
  soak)
    local duration=$(echo "${params}" | jq -r '.duration // "24h"')
    echo "⏱️  Running ${duration} soak test..." >&2
    run_phase "soak" run_soak_test "${duration}" \
      || recover 8 "Soak test failed or timed out" "Check logs for crashes/leaks/underruns, then re-run task=soak" "Stop on soak failure"
    
    CRASHES=$(grep -o '"crashes":[0-9]*' "${WORK_DIR}/soak-${TS}.log" | cut -d: -f2 || echo "1")
    LEAKS=$(grep -o '"memory_leaks":[0-9]*' "${WORK_DIR}/soak-${TS}.log" | cut -d: -f2 || echo "1")
    UNDERRUNS=$(grep -o '"audio_underruns":[0-9]*' "${WORK_DIR}/soak-${TS}.log" | cut -d: -f2 || echo "1")
    echo "Crashes: ${CRASHES}, Memory Leaks: ${LEAKS}, Audio Underruns: ${UNDERRUNS}" >&2
    if (( CRASHES > 0 )) || (( LEAKS > 0 )) || (( UNDERRUNS > 0 )); then
      recover 9 "Soak test violations (Crashes: ${CRASHES}, Leaks: ${LEAKS}, Underruns: ${UNDERRUNS})" "Fix stability issues, then re-run task=soak" "Stop on soak violation"
    fi
    emit_json "success" "24h soak test passed: Zero crashes/leaks/underruns" '["report"]' "[\"${WORK_DIR}/soak-${TS}.log\", \"${REPORT_FILE}\"]"
    ;;
  full)
    echo "🌪️  Running full chaos engineering suite..." >&2
    run_phase "health" run_health_assess || recover 10 "Health check failed" "Fix health, then re-run task=full" "Stop on health failure"
    for mode in network_partition memory_pressure cpu_throttle kill_sidecar; do
      run_phase "inject-${mode}" run_failure_injection "${mode}" || recover 11 "Injection ${mode} failed" "Check framework, then re-run task=full" "Stop on injection failure"
      run_phase "recovery-${mode}" cargo run --package sensorium-chaos --recovery 2>&1 | tee "${WORK_DIR}/recovery-${mode}-${TS}.log" || recover 12 "Recovery ${mode} failed" "Check recovery, then re-run task=full" "Stop on recovery failure"
    done
    run_phase "predict" run_predictive_recovery || recover 13 "Prediction failed" "Check model, then re-run task=full" "Stop on prediction failure"
    run_phase "soak-1h" run_soak_test "1h" || recover 14 "Short soak failed" "Check stability, then re-run task=full" "Stop on soak failure"
    
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "completed",
  "health_score": ${HEALTH_SCORE:-0},
  "mttr_audio_ms": ${MTTR_AUDIO:-0},
  "mttr_midi_ms": ${MTTR_MIDI:-0},
  "prediction_horizon_s": ${HORIZON:-0},
  "prediction_precision": ${PRECISION:-0},
  "soak_crashes": ${CRASHES:-0},
  "soak_leaks": ${LEAKS:-0},
  "soak_underruns": ${UNDERRUNS:-0}
}
EOF
    emit_json "success" "Full chaos engineering suite completed" '["report"]' "[\"${REPORT_FILE}\", \"${WORK_DIR}/chaos-*-${TS}.log\", \"${WORK_DIR}/health-${TS}.log\", \"${WORK_DIR}/recovery-*-${TS}.log\", \"${WORK_DIR}/predict-${TS}.log\", \"${WORK_DIR}/soak-${TS}.log\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {health,inject,recovery,predict,soak,full}" "Stop on invalid task"
    ;;
esac

exit 0