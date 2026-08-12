#!/usr/bin/env bash
# Shared helper: put Node 24 on PATH for Cloud Agent shells.
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
