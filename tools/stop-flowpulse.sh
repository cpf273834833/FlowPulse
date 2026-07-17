#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_PORT=8080
BACKEND_PORT=8466

usage() {
  cat <<'EOF'
Usage: tools/stop-flowpulse.sh [options]

Options:
  --root-dir PATH        Project root (default: parent of tools/)
  --frontend-port PORT   Frontend port (default: 8080)
  --backend-port PORT    Backend port (default: 8466)
  -h, --help             Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root-dir) ROOT_DIR="${2:?Missing value for --root-dir}"; shift 2 ;;
    --frontend-port) FRONTEND_PORT="${2:?Missing value for --frontend-port}"; shift 2 ;;
    --backend-port) BACKEND_PORT="${2:?Missing value for --backend-port}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ "$FRONTEND_PORT" =~ ^[0-9]+$ && "$BACKEND_PORT" =~ ^[0-9]+$ ]] || {
  echo "Ports must be integers." >&2
  exit 2
}

FRONTEND_PID_FILE="$ROOT_DIR/flow-pulse-fronted/frontend.pid"
BACKEND_PID_FILE="$ROOT_DIR/flow-pulse-server/backend.pid"

declare -a PIDS=()

add_pid() {
  local pid="${1:-}"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  [[ "$pid" == "$$" || "$pid" == "$PPID" ]] && return 0
  local existing
  for existing in "${PIDS[@]:-}"; do
    [[ "$existing" == "$pid" ]] && return 0
  done
  PIDS+=("$pid")
}

collect_pid_file() {
  local file="$1"
  [[ -f "$file" ]] && add_pid "$(cat "$file" 2>/dev/null || true)"
}

collect_port() {
  local port="$1" pid
  while IFS= read -r pid; do add_pid "$pid"; done < <(
    lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  )
}

collect_pattern() {
  local pattern="$1" pid
  while IFS= read -r pid; do add_pid "$pid"; done < <(
    pgrep -f "$pattern" 2>/dev/null || true
  )
}

collect_pid_file "$FRONTEND_PID_FILE"
collect_pid_file "$BACKEND_PID_FILE"
collect_port "$FRONTEND_PORT"
collect_port "$BACKEND_PORT"
collect_pattern 'com\.flowpulse\.web\.FlowPulseApplication|flow-pulse-web-boot\.jar'
collect_pattern 'flow-pulse-fronted.*(npm|everest|node)'

if [[ ${#PIDS[@]} -eq 0 ]]; then
  echo "FlowPulse frontend and backend are not running."
  rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"
  exit 0
fi

echo "Stopping FlowPulse frontend and backend"
for pid in "${PIDS[@]}"; do
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping PID $pid"
    kill "$pid" 2>/dev/null || true
  fi
done

for _ in 1 2 3 4 5; do
  running=false
  for pid in "${PIDS[@]}"; do
    kill -0 "$pid" 2>/dev/null && running=true
  done
  [[ "$running" == false ]] && break
  sleep 1
done

for pid in "${PIDS[@]}"; do
  if kill -0 "$pid" 2>/dev/null; then
    echo "Force stopping PID $pid"
    kill -9 "$pid" 2>/dev/null || true
  fi
done

rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"

if lsof -nP -tiTCP:"$FRONTEND_PORT" -sTCP:LISTEN >/dev/null 2>&1 || \
   lsof -nP -tiTCP:"$BACKEND_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Some FlowPulse ports are still in use; check ports $FRONTEND_PORT and $BACKEND_PORT." >&2
  exit 1
fi

echo "FlowPulse frontend and backend stopped."
