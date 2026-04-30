#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$APP_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env"
  set +a
fi

export CLAIM888_HOST="${CLAIM888_HOST:-0.0.0.0}"
export CLAIM888_PORT="${CLAIM888_PORT:-8123}"
export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH:-}"

exec python3 -m claim888.server
