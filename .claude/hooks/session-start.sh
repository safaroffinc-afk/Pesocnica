#!/bin/bash
# SessionStart hook: join the user's Tailscale tailnet so Claude Code (web)
# can reach private machines (gx10-1/2, macstudio, falcon-*, ugreen-nas, ...).
#
# Requires an environment secret TS_AUTHKEY (a Tailscale auth key, preferably
# ephemeral + tagged, e.g. tag:ci). Without it the hook exits cleanly so the
# session still starts.
set -euo pipefail

log() { echo "[tailscale-hook] $*" >&2; }

# Only run inside Claude Code on the web (remote) environments.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  log "not a remote environment, skipping"
  exit 0
fi

# No auth key -> warn and continue (don't break the session).
if [ -z "${TS_AUTHKEY:-}" ]; then
  log "TS_AUTHKEY is not set; skipping Tailscale setup."
  log "Add it as an environment secret to enable tailnet access."
  exit 0
fi

# 1. Install Tailscale if missing (idempotent).
if ! command -v tailscale >/dev/null 2>&1; then
  log "installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
else
  log "Tailscale already installed: $(tailscale version | head -1)"
fi

# 2. Start the tailscaled daemon if not already running.
mkdir -p /var/lib/tailscale /run/tailscale
if ! tailscale status >/dev/null 2>&1; then
  # Prefer kernel TUN if /dev/net/tun exists, else fall back to userspace.
  if [ -c /dev/net/tun ]; then
    TUN_MODE=""
    log "starting tailscaled (kernel TUN mode)"
  else
    TUN_MODE="--tun=userspace-networking"
    log "starting tailscaled (userspace networking; /dev/net/tun missing)"
  fi
  nohup tailscaled \
    --state=/var/lib/tailscale/tailscaled.state \
    --socket=/run/tailscale/tailscaled.sock \
    ${TUN_MODE} \
    >/var/log/tailscaled.log 2>&1 &
  # Wait for the daemon socket to come up.
  for _ in $(seq 1 20); do
    [ -S /run/tailscale/tailscaled.sock ] && break
    sleep 0.5
  done
fi

# 3. Bring the node up and join the tailnet (idempotent).
tailscale up \
  --authkey="${TS_AUTHKEY}" \
  --hostname="${TS_HOSTNAME:-claude-code-web}" \
  --accept-routes \
  --accept-dns=true \
  --ssh

# 4. Report status and persist the node IP for the session.
if MYIP="$(tailscale ip -4 2>/dev/null | head -1)"; then
  log "joined tailnet as ${TS_HOSTNAME:-claude-code-web} (${MYIP})"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export TAILSCALE_IP=${MYIP}" >> "$CLAUDE_ENV_FILE"
  fi
fi

tailscale status >&2 || true
