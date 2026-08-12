#!/usr/bin/env bash
# Shared helper: put the repo-pinned Node (see daykeep/.nvmrc = 24) and pnpm on PATH.
#
# The Cursor cloud exec-daemon prepends its own Node (v22) shim to PATH for every
# command it runs, which would otherwise shadow the version we want. We therefore
# load nvm and prepend the Node 24 bin directory so it takes precedence.

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

if command -v nvm >/dev/null 2>&1; then
  _node24="$(nvm which 24 2>/dev/null || true)"
  if [ -n "${_node24:-}" ] && [ -x "$_node24" ]; then
    PATH="$(dirname "$_node24"):$PATH"
    export PATH
  fi
fi

# Daykeep's config parser only accepts the strings "true"/"false" for boolean
# env vars; the cloud runtime exports NO_COLOR=1, which fails validation.
export NO_COLOR=false
