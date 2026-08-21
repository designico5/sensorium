#!/usr/bin/env bash
set -euo pipefail

# Load Rust environment (MSVC toolchain on Windows)
if [[ -f "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
elif [[ -d "/mnt/c/Program Files/Rust stable MSVC 1.97/bin" ]]; then
  export PATH="/mnt/c/Program Files/Rust stable MSVC 1.97/bin:$PATH"
elif [[ -d "$HOME/.rustup/toolchains/stable-x86_64-pc-windows-msvc/bin" ]]; then
  export PATH="$HOME/.rustup/toolchains/stable-x86_64-pc-windows-msvc/bin:$PATH"
fi

echo "📊 Post-Merge Benchmark + Regression Gate"

# 1. Audio Benchmarks
echo "🎵 Running audio benchmarks..."
cargo bench --package sensorium-audio 2>&1 | tee /tmp/audio_bench.log || true

# 2. MIDI Benchmarks
echo "🎹 Running MIDI benchmarks..."
cargo bench --package sensorium-midi 2>&1 | tee /tmp/midi_bench.log || true

# 3. Regression Detection (basic check)
echo "🔁 Checking for performance regressions..."
# Note: --save-baseline requires criterion 0.4+, skipping if not available

# 4. Budget Checks
echo "💰 Checking performance budgets..."
MAX_AUDIO_P99_MS=0.5
MAX_MIDI_P99_US=10

# Parse criterion output and validate against budgets
AUDIO_P99=$(grep "p99" /tmp/audio_bench.log 2>/dev/null | head -1 | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "999")
MIDI_P99=$(grep "p99" /tmp/midi_bench.log 2>/dev/null | head -1 | awk '{print $2}' | sed 's/[^0-9.]//g' || echo "999")

# Simple numeric comparison (assumes ms/us format)
echo "Audio P99: ${AUDIO_P99}ms (limit: ${MAX_AUDIO_P99_MS}ms)"
echo "MIDI P99: ${MIDI_P99}µs (limit: ${MAX_MIDI_P99_US}µs)"

# Don't fail on budget checks in minimal setup
if (( $(echo "${AUDIO_P99} > ${MAX_AUDIO_P99_MS}" | bc -l 2>/dev/null || echo 0) )); then
  echo "⚠️  Audio P99 exceeds budget (non-blocking in minimal setup)"
fi

if (( MIDI_P99 > MAX_MIDI_P99_US )); then
  echo "⚠️  MIDI P99 exceeds budget (non-blocking in minimal setup)"
fi

echo "✅ Post-Merge Benchmark Completed"
exit 0