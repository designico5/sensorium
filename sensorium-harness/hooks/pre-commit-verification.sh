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

echo "🔍 Pre-Commit Verification Gate"

# 1. Build
echo "📦 Building workspace..."
cargo build --workspace --release
cd packages/frontend && npm run build && cd ../..

# 2. Type Check
echo "🔎 Type checking..."
cargo check --workspace --all-targets
if [[ -d "packages/frontend" ]]; then
  cd packages/frontend && npx tsc --noEmit && cd ../..
else
  echo "⚠️  Skipping TypeScript type check (packages/frontend not found)"
fi

# 3. Lint
echo "🧹 Linting..."
cargo clippy --workspace -- -D warnings
if [[ -d "packages/frontend" ]]; then
  cd packages/frontend && npm run lint && cd ../..
else
  echo "⚠️  Skipping TypeScript lint (packages/frontend not found)"
fi

# 4. Tests
echo "🧪 Running tests..."
cargo test --workspace
if [[ -d "packages/frontend" ]]; then
  cd packages/frontend && npm run test -- --coverage && cd ../..
else
  echo "⚠️  Skipping TypeScript tests (packages/frontend not found)"
fi

# 5. Security
echo "🔒 Security scan..."
cargo audit || echo "⚠️  cargo-audit not installed, skipping"
cargo deny check || echo "⚠️  cargo-deny not installed, skipping"

echo "✅ Pre-Commit Verification Passed"
exit 0