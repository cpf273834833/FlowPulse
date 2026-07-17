#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_PORT=8080
BACKEND_PORT=8466
MAVEN_REPO="${HOME}/.m2/repository"
BUILD_BACKEND=false

usage() {
  cat <<'EOF'
Usage: tools/restart-flowpulse.sh [options]

Options:
  --root-dir PATH        Project root (default: parent of tools/)
  --frontend-port PORT   Frontend port (default: 8080)
  --backend-port PORT    Backend port (default: 8466)
  --maven-repo PATH      Maven local repository (default: ~/.m2/repository)
  --build-backend        Force rebuilding the backend package
  -h, --help             Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root-dir) ROOT_DIR="${2:?Missing value for --root-dir}"; shift 2 ;;
    --frontend-port) FRONTEND_PORT="${2:?Missing value for --frontend-port}"; shift 2 ;;
    --backend-port) BACKEND_PORT="${2:?Missing value for --backend-port}"; shift 2 ;;
    --maven-repo) MAVEN_REPO="${2:?Missing value for --maven-repo}"; shift 2 ;;
    --build-backend) BUILD_BACKEND=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

stop_port() {
  local port="$1" pids pid
  pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  for pid in $pids; do
    [[ "$pid" == "$$" ]] && continue
    echo "Stopping process listening on port $port: PID $pid"
    kill "$pid" 2>/dev/null || true
  done
  sleep 1
  for pid in $pids; do
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  done
}

stop_project_process() {
  local name="$1" pattern="$2" pids pid
  pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
  [[ -z "$pids" ]] && return 0
  for pid in $pids; do
    [[ "$pid" == "$$" || "$pid" == "$PPID" ]] && continue
    echo "Stopping $name process: PID $pid"
    kill "$pid" 2>/dev/null || true
  done
}

wait_port() {
  local port="$1" timeout="$2" elapsed=0
  while (( elapsed < timeout )); do
    if nc -z 127.0.0.1 "$port" >/dev/null 2>&1; then return 0; fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

find_backend_home() {
  [[ -d "$TARGET_DIR" ]] || return 0
  find "$TARGET_DIR" -maxdepth 2 -type d -path '*/FlowPulse-V*-all/flowpulse-main' \
    -print 2>/dev/null | while IFS= read -r dir; do
      printf '%s\t%s\n' "$(stat -f '%m' "$dir")" "$dir"
    done | sort -rn | head -1 | cut -f2-
}

# FlowPulse targets Java 8. Select it for this process without changing the
# machine-wide Java version used by other projects.
if [[ "$(uname -s)" == "Darwin" ]]; then
  JAVA8_HOME=""
  for candidate in /Library/Java/JavaVirtualMachines/jdk1.8*.jdk/Contents/Home "$(/usr/libexec/java_home -v 1.8 2>/dev/null || true)"; do
    if [[ -x "$candidate/bin/java" && -x "$candidate/bin/javac" ]]; then
      JAVA8_HOME="$candidate"
      break
    fi
  done
  [[ -n "$JAVA8_HOME" ]] || {
    echo "Java 8 JDK is required but no installation containing javac was found." >&2
    exit 1
  }
  export JAVA_HOME="$JAVA8_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Non-interactive shells do not load ~/.bash_profile, so explicitly load NVM
# and select the Node version declared by this project.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  if [[ -f "$ROOT_DIR/.nvmrc" ]]; then
    nvm use --silent "$(<"$ROOT_DIR/.nvmrc")"
  fi
fi

require_command java
require_command npm
require_command mvn
require_command lsof
require_command nc

FRONTEND_DIR="$ROOT_DIR/flow-pulse-fronted"
SERVER_DIR="$ROOT_DIR/flow-pulse-server"
WEB_DIR="$SERVER_DIR/flow-pulse-apps/flow-pulse-web"
TARGET_DIR="$WEB_DIR/target"
FRONTEND_OUT="$FRONTEND_DIR/frontend-start.out.log"
FRONTEND_ERR="$FRONTEND_DIR/frontend-start.err.log"
BACKEND_OUT="$SERVER_DIR/backend.out.log"
BACKEND_ERR="$SERVER_DIR/backend.err.log"
BACKEND_MAIN_CLASS="com.flowpulse.web.FlowPulseApplication"

[[ -d "$FRONTEND_DIR" && -f "$SERVER_DIR/pom.xml" ]] || {
  echo "Invalid project root: $ROOT_DIR" >&2
  exit 1
}

[[ "$FRONTEND_PORT" =~ ^[0-9]+$ && "$BACKEND_PORT" =~ ^[0-9]+$ ]] || {
  echo "Ports must be integers." >&2
  exit 2
}

step "Stopping FlowPulse frontend and backend"
stop_port "$FRONTEND_PORT"
stop_port "$BACKEND_PORT"
stop_project_process "FlowPulse backend" 'com\.flowpulse\.web\.FlowPulseApplication|flow-pulse-web-boot\.jar'
stop_project_process "FlowPulse frontend" 'flow-pulse-fronted.*(npm|everest|node)'
sleep 1

BACKEND_HOME="$(find_backend_home)"
if [[ "$BUILD_BACKEND" == true || -z "$BACKEND_HOME" || ! -d "$BACKEND_HOME/lib" ]]; then
  step "Building backend deploy package"
  (cd "$SERVER_DIR" && mvn -Pall -pl flow-pulse-apps/flow-pulse-web -am package -DskipTests -Dmaven.repo.local="$MAVEN_REPO")
  BACKEND_HOME="$(find_backend_home)"
fi

[[ -n "$BACKEND_HOME" && -d "$BACKEND_HOME" ]] || {
  echo "Backend deploy directory not found after build." >&2
  exit 1
}

step "Starting backend on port $BACKEND_PORT"
: >"$BACKEND_OUT"
: >"$BACKEND_ERR"
BACKEND_DATA_DIR="$BACKEND_HOME/data"
mkdir -p "$BACKEND_DATA_DIR"
(
  cd "$BACKEND_HOME"
  nohup java \
    -Dapp.name=flowpulse \
    -Dinstall.dir="$BACKEND_HOME" \
    -Dspring.profiles.active=prod \
    -Dlogging.config="$BACKEND_HOME/config/logback-spring.xml" \
    -Dspring.config.location="file:$BACKEND_HOME/config/" \
    -Duser.dir="$BACKEND_HOME" \
    -Ddecrypt.host=10.1.53.201 \
    -DFLOWPULSE_DATA_DIR="$BACKEND_DATA_DIR" \
    -cp "$BACKEND_HOME/config:$BACKEND_HOME/lib/*" \
    "$BACKEND_MAIN_CLASS" >"$BACKEND_OUT" 2>"$BACKEND_ERR" &
  echo $! >"$SERVER_DIR/backend.pid"
)

step "Starting frontend on port $FRONTEND_PORT"
: >"$FRONTEND_OUT"
: >"$FRONTEND_ERR"
(
  cd "$FRONTEND_DIR"
  nohup npm start >"$FRONTEND_OUT" 2>"$FRONTEND_ERR" &
  echo $! >"$FRONTEND_DIR/frontend.pid"
)

step "Checking ports"
backend_ready=false
frontend_ready=false
wait_port "$BACKEND_PORT" 90 && backend_ready=true
wait_port "$FRONTEND_PORT" 90 && frontend_ready=true

printf '\n'
if [[ "$frontend_ready" == true ]]; then
  echo "Frontend ready: http://localhost:$FRONTEND_PORT/flowpulse/"
else
  echo "Frontend is not listening on port $FRONTEND_PORT. Check $FRONTEND_OUT and $FRONTEND_ERR" >&2
fi
if [[ "$backend_ready" == true ]]; then
  echo "Backend ready:  http://localhost:$BACKEND_PORT/flowpulse"
else
  echo "Backend is not listening on port $BACKEND_PORT. Check $BACKEND_OUT and $BACKEND_ERR" >&2
fi

printf '\nLogs:\n  Frontend stdout: %s\n  Frontend stderr: %s\n  Backend stdout:  %s\n  Backend stderr:  %s\n' \
  "$FRONTEND_OUT" "$FRONTEND_ERR" "$BACKEND_OUT" "$BACKEND_ERR"

[[ "$frontend_ready" == true && "$backend_ready" == true ]]
