#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$APP_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

export PYTHONPATH="${PROJECT_ROOT}:${PYTHONPATH:-}"

python3 -m unittest claim888.tests.test_backend claim888.tests.test_config -v
