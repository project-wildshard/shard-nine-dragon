#!/usr/bin/env bash
# One command to reproduce the Nine Dragon shader failure recovery in both browser engines.
# The SDK serves the build (`wildshard dev`, which builds the shard first); engine's own
# test-facade-instancing guards facade routing, so it no longer runs here (meta QA 11-25 row 125).
# Browsers are headless and muted; on macOS the runs hold the Mac's GPU lock (desktop-gpu.lock).
set -euo pipefail

cd "$(dirname "$0")/../.."

port=${NINE_GPU_BOOT_PORT:-4184}
log=$(mktemp)
# The bin itself, not `pnpm exec`: a signal to pnpm would leave the server running.
./node_modules/.bin/wildshard dev src "$port" >"$log" 2>&1 &
server_pid=$!
# dev ends on SIGTERM once its server closes, and at once on a second signal.
cleanup() {
  kill -TERM "$server_pid" 2>/dev/null || true
  for _ in {1..25}; do kill -0 "$server_pid" 2>/dev/null || break; sleep 0.2; done
  kill -INT "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  rm -f "$log"
}
trap cleanup EXIT

# The first build takes a minute or more: wait up to five.
ready=0
for _ in {1..1500}; do
  if curl -fsS "http://127.0.0.1:$port/version.json" >/dev/null 2>&1; then ready=1; break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then cat "$log"; exit 1; fi
  sleep 0.2
done

if [[ "$ready" -ne 1 ]]; then cat "$log"; exit 1; fi

locked=()
lock_root=${WS_LOCK_ROOT:-$HOME/projects/games/wildshard/engine/tmp}
if [[ "$(uname -s)" == Darwin && -d "$lock_root" ]]; then
  locked=(/usr/bin/lockf -k "$lock_root/desktop-gpu.lock" /usr/bin/lockf -k "$lock_root/mini-measure.lock")
fi

for fault in context precision shader texture; do
  ${locked[@]+"${locked[@]}"} node src/scripts/test-nine-gpu-boot.mjs --url="http://127.0.0.1:$port" --only=all --fault="$fault"
done

if [[ "$(uname -s)" == Darwin ]]; then
  ${locked[@]+"${locked[@]}"} node src/scripts/test-nine-native-startup.mjs --url="http://127.0.0.1:$port"
fi
