#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$APP_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

mkdir -p "$APP_DIR/static/vendor"

npx esbuild "$APP_DIR/static/privy-entry.js" \
  --bundle \
  --format=iife \
  --platform=browser \
  --target=es2020 \
  --global-name=Claim888Privy \
  --outfile="$APP_DIR/static/vendor/privy.bundle.js"
