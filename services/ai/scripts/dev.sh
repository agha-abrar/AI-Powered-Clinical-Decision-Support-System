#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PYTHON=${PYTHON:-python3.10}

if [ -d ".venv" ]; then
  VENV_PYTHON=".venv/bin/python"
  if [ -x "$VENV_PYTHON" ]; then
    VENV_VERSION=$($VENV_PYTHON -V 2>&1 | awk '{print $2}')
  else
    VENV_VERSION=""
  fi
  if [ "$VENV_VERSION" != "$($PYTHON -V 2>&1 | awk '{print $2}')" ]; then
    rm -rf .venv
  fi
fi

if [ ! -d ".venv" ]; then
  $PYTHON -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -q -r requirements.txt
uvicorn app.main:app --reload --port "${AI_SERVICE_PORT:-8001}"
