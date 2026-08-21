#!/usr/bin/env bash
set -euo pipefail

# Agent: release-automation
# Schema-first runner following agent-harness-construction principles
# Input: JSON on stdin  { "task": "...", "params": {...}, "context": {...} }
# Output: JSON on stdout { "status": "success|warning|error", "summary": "...", "next_actions": [...], "artifacts": [...] }

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AGENT_DIR="${BASE_DIR}/agents/release-automation"
WORK_DIR="${AGENT_DIR}/work"
mkdir -p "${WORK_DIR}"
REPORT_DIR="${BASE_DIR}/reports/release"
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
task="$(echo "${input}" | jq -r '.task // "dist"')"
params="$(echo "${input}" | jq -c '.params // {}')"
context="$(echo "${input}" | jq -c '.context // {}')"

TS=$(date -u +%Y%m%d-%H%M%S)
REPORT_FILE="${REPORT_DIR}/${TS}.json"

case "${task}" in
  dist)
    echo "📦 Running cargo-dist for multi-platform release..." >&2
    run_phase "cargo-dist" cargo dist --workspace --artifacts=all 2>&1 | tee "${WORK_DIR}/dist-${TS}.log" \
      || recover 1 "cargo-dist failed" "Check dist config, then re-run task=dist" "Stop on dist failure"
    
    # Verify artifacts exist for all targets
    for target in x86_64-unknown-linux-gnu x86_64-pc-windows-msvc aarch64-apple-darwin x86_64-apple-darwin; do
      if ! find "${BASE_DIR}/target/artifacts" -name "*${target}*" | grep -q .; then
        recover 2 "Missing artifact for ${target}" "Check cargo-dist config for ${target}, then re-run task=dist" "Stop on missing artifact"
      fi
    done
    emit_json "success" "cargo-dist completed for all targets" '["sign", "sbom"]' "[\"${WORK_DIR}/dist-${TS}.log\", \"${BASE_DIR}/target/artifacts\"]"
    ;;
  sign)
    echo "🔏 Signing multi-platform binaries..." >&2
    run_phase "sign-linux" cargo run --package sensorium-release --sign --target x86_64-unknown-linux-gnu --format appimage 2>&1 | tee "${WORK_DIR}/sign-linux-${TS}.log" \
      || recover 3 "Linux signing failed" "Check signing keys, then re-run task=sign" "Stop on signing failure"
    run_phase "sign-windows" cargo run --package sensorium-release --sign --target x86_64-pc-windows-msvc --format msix 2>&1 | tee "${WORK_DIR}/sign-windows-${TS}.log" \
      || recover 4 "Windows signing failed" "Check signing cert, then re-run task=sign" "Stop on signing failure"
    run_phase "sign-macos" cargo run --package sensorium-release --sign --target aarch64-apple-darwin --format dmg 2>&1 | tee "${WORK_DIR}/sign-macos-${TS}.log" \
      || recover 5 "macOS signing failed" "Check signing identity, then re-run task=sign" "Stop on signing failure"
    run_phase "sign-ios" cargo run --package sensorium-release --sign --target aarch64-apple-ios --format ipa 2>&1 | tee "${WORK_DIR}/sign-ios-${TS}.log" \
      || recover 6 "iOS signing failed" "Check provisioning profile, then re-run task=sign" "Stop on signing failure"
    run_phase "sign-android" cargo run --package sensorium-release --sign --target aarch64-linux-android --format apk 2>&1 | tee "${WORK_DIR}/sign-android-${TS}.log" \
      || recover 7 "Android signing failed" "Check keystore, then re-run task=sign" "Stop on signing failure"
    emit_json "success" "All platforms signed successfully" '["sbom", "hotreload"]' "[\"${WORK_DIR}/sign-*-${TS}.log\"]"
    ;;
  sbom)
    echo "📋 Generating SBOM and Provenance (Syft + SLSA)..." >&2
    run_phase "syft" syft packages "${BASE_DIR}/target/artifacts" -o json > "${WORK_DIR}/sbom-${TS}.json" \
      || recover 8 "SBOM generation failed" "Check syft install, then re-run task=sbom" "Stop on SBOM failure"
    run_phase "slsa" slsa-verifier verify-artifact "${BASE_DIR}/target/artifacts" --provenance-path "${WORK_DIR}/provenance-${TS}.json" 2>&1 | tee "${WORK_DIR}/slsa-${TS}.log" \
      || recover 9 "SLSA provenance failed" "Check SLSA setup, then re-run task=sbom" "Stop on provenance failure"
    
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "completed",
  "sbom": "${WORK_DIR}/sbom-${TS}.json",
  "provenance": "${WORK_DIR}/provenance-${TS}.json",
  "platforms_signed": ["linux-appimage", "windows-msix", "macos-dmg", "ios-ipa", "android-apk"]
}
EOF
    emit_json "success" "SBOM and SLSA provenance generated" '["hotreload", "publish"]' "[\"${WORK_DIR}/sbom-${TS}.json\", \"${WORK_DIR}/provenance-${TS}.json\", \"${REPORT_FILE}\"]"
    ;;
  hotreload)
    echo "🔥 Testing Hot Reload (Rust <2s, TS <200ms)..." >&2
    run_phase "cargo-watch" timeout 10s cargo watch -x "build --package sensorium-audio" 2>&1 | tee "${WORK_DIR}/hotreload-rust-${TS}.log" &
    WATCH_PID=$!
    sleep 2
    # Simulate file change
    touch "${BASE_DIR}/sensorium-audio/src/lib.rs"
    sleep 3
    kill ${WATCH_PID} 2>/dev/null || true
    
    RUST_RELOAD=$(grep -o "Compiling.*finished in [0-9.]*s" "${WORK_DIR}/hotreload-rust-${TS}.log" | tail -1 | grep -o "[0-9.]*s" | sed 's/s//' || echo "999")
    echo "Rust hot reload: ${RUST_RELOAD}s (limit: 2s)" >&2
    if (( $(echo "${RUST_RELOAD} > 2" | bc -l 2>/dev/null || echo 1) )); then
      recover 10 "Rust hot reload ${RUST_RELOAD}s exceeds 2s budget" "Optimize build, then re-run task=hotreload" "Stop on hot reload budget violation"
    fi
    
    run_phase "vite-hmr" cd "${BASE_DIR}/packages/frontend" && timeout 5s npm run dev -- --hmr-timeout 200 2>&1 | tee "${WORK_DIR}/hotreload-ts-${TS}.log" &
    VITE_PID=$!
    sleep 1
    touch "${BASE_DIR}/packages/frontend/src/App.tsx"
    sleep 1
    kill ${VITE_PID} 2>/dev/null || true
    
    TS_RELOAD=$(grep -o "HMR update.*in [0-9.]*ms" "${WORK_DIR}/hotreload-ts-${TS}.log" | tail -1 | grep -o "[0-9.]*" | head -1 || echo "999")
    echo "TypeScript HMR: ${TS_RELOAD}ms (limit: 200ms)" >&2
    if (( TS_RELOAD > 200 )); then
      recover 11 "TS HMR ${TS_RELOAD}ms exceeds 200ms budget" "Optimize Vite config, then re-run task=hotreload" "Stop on HMR budget violation"
    fi
    
    # Sidecar test
    run_phase "sidecar" cargo run --package sensorium-release --sidecar-test 2>&1 | tee "${WORK_DIR}/sidecar-${TS}.log" \
      || recover 12 "Sidecar test failed (4 processes)" "Check sidecar config, then re-run task=hotreload" "Stop on sidecar failure"
    
    emit_json "success" "Hot reload budgets met (Rust: ${RUST_RELOAD}s, TS: ${TS_RELOAD}ms), 4 sidecars verified" '["publish"]' "[\"${WORK_DIR}/hotreload-*-${TS}.log\", \"${WORK_DIR}/sidecar-${TS}.log\"]"
    ;;
  publish)
    echo "🚀 Publishing release to GitHub..." >&2
    VERSION=$(echo "${params}" | jq -r '.version // "auto"')
    run_phase "publish" cargo run --package sensorium-release --publish --version "${VERSION}" 2>&1 | tee "${WORK_DIR}/publish-${TS}.log" \
      || recover 13 "Publish failed" "Check GitHub token/perms, then re-run task=publish" "Stop on publish failure"
    emit_json "success" "Release published to GitHub (version: ${VERSION})" '[]' "[\"${WORK_DIR}/publish-${TS}.log\", \"${REPORT_FILE}\"]"
    ;;
  eval)
    echo "📊 Running EVAL harness integration..." >&2
    run_phase "eval-m1" bash "${BASE_DIR}/hooks/eval-runner.sh" M1 report 2>&1 | tee "${WORK_DIR}/eval-m1-${TS}.log" \
      || recover 14 "M1 eval failed" "Check M1 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m2" bash "${BASE_DIR}/hooks/eval-runner.sh" M2 report 2>&1 | tee "${WORK_DIR}/eval-m2-${TS}.log" \
      || recover 15 "M2 eval failed" "Check M2 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m3" bash "${BASE_DIR}/hooks/eval-runner.sh" M3 report 2>&1 | tee "${WORK_DIR}/eval-m3-${TS}.log" \
      || recover 16 "M3 eval failed" "Check M3 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m4" bash "${BASE_DIR}/hooks/eval-runner.sh" M4 report 2>&1 | tee "${WORK_DIR}/eval-m4-${TS}.log" \
      || recover 17 "M4 eval failed" "Check M4 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m5" bash "${BASE_DIR}/hooks/eval-runner.sh" M5 report 2>&1 | tee "${WORK_DIR}/eval-m5-${TS}.log" \
      || recover 18 "M5 eval failed" "Check M5 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m6" bash "${BASE_DIR}/hooks/eval-runner.sh" M6 report 2>&1 | tee "${WORK_DIR}/eval-m6-${TS}.log" \
      || recover 19 "M6 eval failed" "Check M6 evals, then re-run task=eval" "Stop on eval failure"
    run_phase "eval-m7" bash "${BASE_DIR}/hooks/eval-runner.sh" M7 report 2>&1 | tee "${WORK_DIR}/eval-m7-${TS}.log" \
      || recover 20 "M7 eval failed" "Check M7 evals, then re-run task=eval" "Stop on eval failure"
    
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "completed",
  "gates_passed": ["M1", "M2", "M3", "M4", "M5", "M6", "M7"],
  "eval_reports": "${BASE_DIR}/eval-reports"
}
EOF
    emit_json "success" "All 7 EVAL gates passed" '["report"]' "[\"${REPORT_FILE}\", \"${WORK_DIR}/eval-*-${TS}.log\"]"
    ;;
  full)
    echo "🚀 Running full release automation pipeline..." >&2
    run_phase "dist" bash "${BASH_SOURCE[0]}" <<< '{"task":"dist"}' || recover 21 "Dist failed" "Fix dist, then re-run task=full" "Stop on dist failure"
    run_phase "sign" bash "${BASH_SOURCE[0]}" <<< '{"task":"sign"}' || recover 22 "Sign failed" "Fix signing, then re-run task=full" "Stop on sign failure"
    run_phase "sbom" bash "${BASH_SOURCE[0]}" <<< '{"task":"sbom"}' || recover 23 "SBOM failed" "Fix SBOM, then re-run task=full" "Stop on SBOM failure"
    run_phase "hotreload" bash "${BASH_SOURCE[0]}" <<< '{"task":"hotreload"}' || recover 24 "Hot reload failed" "Fix hot reload, then re-run task=full" "Stop on hot reload failure"
    run_phase "eval" bash "${BASH_SOURCE[0]}" <<< '{"task":"eval"}' || recover 25 "Eval failed" "Fix evals, then re-run task=full" "Stop on eval failure"
    
    cat > "${REPORT_FILE}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "completed",
  "pipeline": "full",
  "artifacts": "target/artifacts",
  "sbom": "${WORK_DIR}/sbom-${TS}.json",
  "provenance": "${WORK_DIR}/provenance-${TS}.json",
  "all_gates_passed": true
}
EOF
    emit_json "success" "Full release automation pipeline completed successfully" '[]' "[\"${REPORT_FILE}\", \"${BASE_DIR}/target/artifacts\", \"${WORK_DIR}/*-${TS}.log\"]"
    ;;
  *)
    recover 99 "Unknown task: ${task}" "Use task in {dist,sign,sbom,hotreload,publish,eval,full}" "Stop on invalid task"
    ;;
esac

exit 0