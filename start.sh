#!/usr/bin/env bash
set -e

PORT_BACKEND=${PORT_BACKEND:-3001}
PORT_FRONTEND=${PORT_FRONTEND:-5173}

DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
  wait $FRONTEND_PID $BACKEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ClearingHouse.OS — Full Stack          ║"
echo "║   Shared-Sequencer Liquidity Rebalancer   ║"
echo "╠══════════════════════════════════════════╣"
echo "║   Frontend: http://localhost:$PORT_FRONTEND         ║"
echo "║   Backend:  http://localhost:$PORT_BACKEND          ║"
echo "║   Dashboard: http://localhost:$PORT_FRONTEND/#dashboard ║"
echo "╚══════════════════════════════════════════╝"
echo ""

echo "[start] Starting backend engine on port $PORT_BACKEND..."
npx tsx server/index.ts &
BACKEND_PID=$!
sleep 2

echo "[start] Starting frontend dev server on port $PORT_FRONTEND..."
npx vite --host 0.0.0.0 --port $PORT_FRONTEND &
FRONTEND_PID=$!
sleep 2

echo ""
echo "[start] Ready. Press Ctrl+C to stop."
echo ""
echo "  Landing:   http://localhost:$PORT_FRONTEND"
echo "  Dashboard: http://localhost:$PORT_FRONTEND/#dashboard"
echo "  API:       http://localhost:$PORT_BACKEND/api/state"
echo ""

wait
