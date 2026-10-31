#!/usr/bin/env bash
# Capture desktop and mobile screenshots of the running preview.
# Evidence goes to CAPTURE_DIR (outside the source tree); the app keeps running.
set -euo pipefail

t() { /usr/bin/time -p "$@"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL to capture.}"
CAPTURE_DIR="${CAPTURE_DIR:-${RUNNER_TEMP:-/tmp}/omgithub-capture}"
export CAPTURE_URL CAPTURE_DIR

# Screenshots are evidence, never source.
project_real="$(realpath -m "$PROJECT_DIR")"
capture_real="$(realpath -m "$CAPTURE_DIR")"
case "$capture_real/" in
  "$project_real"/*)
    echo "CAPTURE_DIR must be outside $project_real (got $capture_real)." >&2
    exit 1
    ;;
esac

t mkdir -p "$CAPTURE_DIR"

RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
CAPTURE_RUNNER="$RUNTIME_DIR/scripts/default-capture.mjs"
if [[ ! -f "$CAPTURE_RUNNER" ]]; then
  echo "Capture runtime not found: $CAPTURE_RUNNER" >&2
  exit 75
fi

# Wait for the app to finish its first render, not just for a body tag.
export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-#app[data-ready='true']}"

set +e
t node "$CAPTURE_RUNNER"
status=$?
set -e

if [[ "$status" -ne 0 ]]; then
  # 75 stays a temporary infrastructure failure; anything else is a defect.
  [[ "$status" -eq 75 ]] || status=1
  echo "Capture failed (exit $status)." >&2
  exit "$status"
fi

for view in desktop mobile; do
  shot="$CAPTURE_DIR/final-$view.png"
  if [[ ! -s "$shot" ]]; then
    echo "Missing capture: $shot" >&2
    exit 1
  fi
  size="$(stat -c %s "$shot")"
  if ((size < 10000)); then
    echo "Capture looks blank: $shot ($size bytes)" >&2
    exit 1
  fi
  t stat -c '%n %s bytes' "$shot"
done

echo "Captured desktop and mobile views in $CAPTURE_DIR"
