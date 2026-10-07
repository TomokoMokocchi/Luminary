#!/usr/bin/env bash
# Expose the local SFOTH server to the internet via an ngrok HTTP tunnel.
#
# One-time setup:
#   1. Install ngrok:            https://ngrok.com/download
#   2. Add your authtoken:       ngrok config add-authtoken <YOUR_TOKEN>
#
# Then just run:  ./public.sh
# ngrok prints a public https URL — share "<that-url>/SFOTH/" with friends.
#
# Notes on how traffic flows:
#   * The ngrok tunnel carries the HTTP side (lobby, API, WebRTC *signalling*,
#     and the SSE spectator stream). Players load the game over it.
#   * The actual gameplay runs over WebRTC data channels, which connect
#     peer-to-peer. The server advertises a STUN-discovered (srflx) candidate,
#     so this works whenever the host's router allows inbound UDP (most home /
#     full-cone NATs). On a restrictive / symmetric NAT you need a TURN relay:
#     add it to ICE_SERVERS in index.js and to the /api/guest/ice response.
set -euo pipefail
PORT="${PORT:-8099}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is not installed. Get it at https://ngrok.com/download, then run:"
  echo "  ngrok config add-authtoken <YOUR_TOKEN>"
  exit 1
fi

echo "Starting SFOTH server on :$PORT ..."
( cd "$HERE" && PORT="$PORT" node index.js "$PORT" ) &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 2

echo "Opening public ngrok tunnel to :$PORT ..."
echo "Share the https URL below with  /SFOTH/  appended."
exec ngrok http "$PORT"
