#!/usr/bin/env bash
# Build the static site when needed and serve it in the foreground on $PORT.
# Source lives in web/, the deployment directory is dist/, both inside PROJECT_DIR.
set -euo pipefail

t() { /usr/bin/time -p "$@"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
DIST_DIR="$PROJECT_DIR/dist"
# Worker metadata only; build output and evidence stay inside PROJECT_DIR.
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
DEPLOYMENT_OUTPUT="$WEB_DIR/deployment-output.json"
export PORT DIST_DIR PROJECT_DIR DEPLOYMENT_OUTPUT

t mkdir -p "$WEB_DIR"

# 1. Install dependencies only when package.json declares any and they are absent.
if [[ -f package.json ]] && node -e 'const p = require("./package.json"); process.exit(Object.keys({ ...(p.dependencies || {}), ...(p.devDependencies || {}) }).length ? 0 : 1)'; then
  if [[ ! -d node_modules ]]; then
    if [[ -f package-lock.json ]]; then
      t npm ci --no-audit --no-fund
    else
      t npm install --no-audit --no-fund
    fi
  fi
fi

# 2. Rebuild only when web/ changed or the build is missing.
STAMP="$WEB_DIR/build-stamp"
source_hash() {
  t bash -c 'find web -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum' | awk '{print $1}'
}
current_hash="$(source_hash)"
previous_hash=""
[[ ! -f "$STAMP" ]] || previous_hash="$(cat "$STAMP")"

if [[ "$current_hash" != "$previous_hash" ]] || [[ ! -f "$DIST_DIR/index.html" ]]; then
  t node scripts/build.mjs
  t /usr/bin/printf '%s' "$current_hash" > "$STAMP"
else
  echo "Reusing existing build in $DIST_DIR"
fi

# 3. Publish the deployment directory for the controller.
t node -e '
const fs = require("node:fs")
const out = process.env.DEPLOYMENT_OUTPUT
const data = JSON.stringify({ project: process.env.PROJECT_DIR, directory: process.env.DIST_DIR })
const tmp = `${out}.tmp.${process.pid}`
fs.writeFileSync(tmp, `${data}\n`)
fs.renameSync(tmp, out)
'

# 4. Serve in the foreground.
echo "Serving $DIST_DIR on http://0.0.0.0:$PORT"
t node scripts/serve.mjs
