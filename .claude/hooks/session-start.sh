#!/bin/bash
# SessionStart hook: join the user's Tailscale tailnet so Claude Code (web)
# can reach private machines (gx10-1/2, macstudio, falcon-*, ugreen-nas, ...).
#
# Requires an environment secret TS_AUTHKEY (a Tailscale auth key, preferably
# ephemeral + tagged, e.g. tag:ci). The hook is "best effort": any failure is
# logged and the hook exits 0 so the session always starts.
#
# Optional env knobs:
#   TS_AUTHKEY        (required) Tailscale auth key
#   TS_HOSTNAME       node name in the tailnet (default: claude-code-web)
#   TS_ACCEPT_DNS     use MagicDNS so `ssh gx10-1` resolves (default: true)
#   TS_ACCEPT_ROUTES  pull advertised subnet routes (default: false)
#   TS_SSH            run an INBOUND Tailscale SSH server here (default: false)
#   TS_VERSION        pin a Tailscale version, e.g. 1.98.4 (default: latest)
set -uo pipefail

log() { echo "[tailscale-hook] $*" >&2; }
# Best-effort guard: log and exit 0 instead of failing the session.
bail() { log "$*"; log "skipping Tailscale setup (session continues)."; exit 0; }

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

# Pick writable locations for state/socket/log (root -> /var, else -> $HOME).
if mkdir -p /var/lib/tailscale /run/tailscale 2>/dev/null && [ -w /var/lib/tailscale ]; then
  TS_STATE_DIR=/var/lib/tailscale
  TS_SOCKET=/run/tailscale/tailscaled.sock
  TS_LOG=/var/log/tailscaled.log
else
  TS_STATE_DIR="${HOME:-/tmp}/.tailscale"
  TS_SOCKET="${HOME:-/tmp}/.tailscale/tailscaled.sock"
  TS_LOG="${HOME:-/tmp}/.tailscale/tailscaled.log"
  mkdir -p "$TS_STATE_DIR" || bail "cannot create state dir $TS_STATE_DIR"
fi
# Make sure every tailscale CLI call talks to this exact socket.
export TAILSCALE_SOCKET="$TS_SOCKET"
TS="tailscale --socket=$TS_SOCKET"

# 1. Install Tailscale if missing (best effort, no blind pipe-to-shell).
if ! command -v tailscale >/dev/null 2>&1; then
  log "installing Tailscale${TS_VERSION:+ (pinned $TS_VERSION)}..."
  installer="$(mktemp)"
  if ! curl -fsSL https://tailscale.com/install.sh -o "$installer"; then
    rm -f "$installer"; bail "failed to download Tailscale installer"
  fi
  if ! TRACK="${TS_VERSION:+stable}" VERSION="${TS_VERSION:-}" sh "$installer"; then
    rm -f "$installer"; bail "Tailscale install script failed"
  fi
  rm -f "$installer"
else
  log "Tailscale already installed: $(tailscale version | head -1)"
fi

# 2. Start the tailscaled daemon if not already running.
if ! $TS status >/dev/null 2>&1; then
  if [ -c /dev/net/tun ]; then
    NET_FLAGS=""
    USERSPACE=0
    log "starting tailscaled (kernel TUN mode)"
  else
    # Userspace networking: tailscaled also acts as a SOCKS5/HTTP proxy that
    # apps must use to reach the tailnet. Expose it and wire up proxy env vars.
    PROXY_PORT="${TS_PROXY_PORT:-1055}"
    NET_FLAGS="--tun=userspace-networking --socks5-server=localhost:${PROXY_PORT} --outbound-http-proxy-listen=localhost:${PROXY_PORT}"
    USERSPACE=1
    log "starting tailscaled (userspace networking; proxy on localhost:${PROXY_PORT})"
  fi
  nohup tailscaled \
    --state="$TS_STATE_DIR/tailscaled.state" \
    --socket="$TS_SOCKET" \
    ${NET_FLAGS} \
    >"$TS_LOG" 2>&1 &
  for _ in $(seq 1 20); do
    [ -S "$TS_SOCKET" ] && break
    sleep 0.5
  done
  [ -S "$TS_SOCKET" ] || bail "tailscaled socket did not appear (see $TS_LOG)"
fi

# 3. Bring the node up and join the tailnet (best effort).
#    Inbound SSH, subnet routes are opt-in; MagicDNS on by default for name SSH.
UP_FLAGS=()
[ "${TS_ACCEPT_DNS:-true}" = "true" ]    && UP_FLAGS+=("--accept-dns=true")    || UP_FLAGS+=("--accept-dns=false")
[ "${TS_ACCEPT_ROUTES:-false}" = "true" ] && UP_FLAGS+=("--accept-routes")
[ "${TS_SSH:-false}" = "true" ]           && UP_FLAGS+=("--ssh")

# Cap auth time so a bad/expired key can't hang SessionStart (best effort).
if ! timeout "${TS_UP_TIMEOUT:-45}" $TS up \
  --authkey="${TS_AUTHKEY}" \
  --hostname="${TS_HOSTNAME:-claude-code-web}" \
  --timeout=30s \
  "${UP_FLAGS[@]}"; then
  bail "tailscale up failed or timed out (see $TS_LOG)"
fi

# 4. Report status and persist node IP + proxy for the session (deduped).
persist() { # key value
  [ -n "${CLAUDE_ENV_FILE:-}" ] || return 0
  grep -v "^export $1=" "$CLAUDE_ENV_FILE" >"$CLAUDE_ENV_FILE.tmp" 2>/dev/null || true
  mv "$CLAUDE_ENV_FILE.tmp" "$CLAUDE_ENV_FILE" 2>/dev/null || true
  echo "export $1=$2" >> "$CLAUDE_ENV_FILE"
}

if MYIP="$($TS ip -4 2>/dev/null | head -1)"; then
  log "joined tailnet as ${TS_HOSTNAME:-claude-code-web} (${MYIP})"
  persist TAILSCALE_IP "$MYIP"
fi
persist TAILSCALE_SOCKET "$TS_SOCKET"
if [ "${USERSPACE:-0}" = "1" ]; then
  PROXY="socks5://localhost:${TS_PROXY_PORT:-1055}"
  persist ALL_PROXY "$PROXY"
  persist HTTP_PROXY "http://localhost:${TS_PROXY_PORT:-1055}"
  log "userspace mode: route traffic via \$ALL_PROXY ($PROXY)"
fi

$TS status >&2 || true
