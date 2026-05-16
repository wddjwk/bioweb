#!/bin/bash
# BioWeb Service Manager
# Usage: ./manager.sh {start|stop|restart|status} [-p PORT]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.bioweb.pid"
LOG_FILE="$SCRIPT_DIR/bioweb.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse port from args: -p PORT or --port PORT
parse_port() {
  local port="${BIOWEB_PORT:-3000}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -p|--port)
        port="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  echo "$port"
}

# Store all args for port parsing
ALL_ARGS=("$@")
# First arg is the command
CMD="${1:-}"
# Parse port from remaining args
PORT=$(parse_port "${ALL_ARGS[@]}")

get_pid() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

do_start() {
  if pid=$(get_pid); then
    echo -e "${YELLOW}⚠ BioWeb is already running (PID: $pid)${NC}"
    return 0
  fi

  echo -e "${GREEN}🌿 Starting BioWeb...${NC}"

  # Check node
  if ! command -v node &>/dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
  fi

  # Install dependencies if needed
  if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "   Installing server dependencies..."
    cd "$SCRIPT_DIR" && npm install --registry=https://registry.npmmirror.com --production --quiet 2>&1 | tail -3
  fi

  if [ ! -d "$SCRIPT_DIR/client/node_modules" ]; then
    echo "   Installing client dependencies..."
    cd "$SCRIPT_DIR/client" && npm install --registry=https://registry.npmmirror.com --quiet 2>&1 | tail -3
  fi

  # Build frontend if not built
  if [ ! -d "$SCRIPT_DIR/client/dist" ]; then
    echo "   Building frontend..."
    cd "$SCRIPT_DIR/client" && npm run build 2>&1 | tail -3
  fi

  # Start server
  cd "$SCRIPT_DIR"
  NODE_ENV=production PORT="$PORT" nohup node server/index.js > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  # Wait a moment and check
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    echo -e "${GREEN}✓ BioWeb started successfully${NC}"
    echo -e "  PID:  $pid"
    echo -e "  URL:  http://localhost:$PORT"
    echo -e "  Log:  $LOG_FILE"
  else
    echo -e "${RED}✗ Failed to start BioWeb. Check $LOG_FILE${NC}"
    rm -f "$PID_FILE"
    exit 1
  fi
}

do_stop() {
  if pid=$(get_pid); then
    echo -e "${YELLOW}Stopping BioWeb (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null
    
    # Wait for graceful shutdown
    for i in $(seq 1 10); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 1
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null
    fi

    rm -f "$PID_FILE"
    echo -e "${GREEN}✓ BioWeb stopped${NC}"
  else
    echo -e "${YELLOW}⚠ BioWeb is not running${NC}"
  fi
}

do_restart() {
  do_stop
  sleep 1
  do_start
}

do_status() {
  if pid=$(get_pid); then
    echo -e "${GREEN}● BioWeb is running${NC}"
    echo -e "  PID:   $pid"
    echo -e "  PORT:  $PORT"
    echo -e "  URL:   http://localhost:$PORT"
    
    # Memory usage
    if command -v ps &>/dev/null; then
      local mem
      mem=$(ps -p "$pid" -o rss= 2>/dev/null || echo "0")
      echo -e "  MEM:   $((mem / 1024)) MB"
    fi
    
    # Uptime
    if [ -f "$PID_FILE" ]; then
      local started
      started=$(stat -c %Y "$PID_FILE" 2>/dev/null || stat -f %m "$PID_FILE" 2>/dev/null || echo "0")
      local now
      now=$(date +%s)
      local uptime=$((now - started))
      local hours=$((uptime / 3600))
      local minutes=$(( (uptime % 3600) / 60 ))
      echo -e "  UP:    ${hours}h ${minutes}m"
    fi
  else
    echo -e "${RED}● BioWeb is not running${NC}"
  fi
}

case "${CMD}" in
  start)   do_start ;;
  stop)    do_stop ;;
  restart) do_restart ;;
  status)  do_status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status} [-p PORT]"
    echo ""
    echo "  start    - Start BioWeb server"
    echo "  stop     - Stop BioWeb server"
    echo "  restart  - Restart BioWeb server"
    echo "  status   - Show server status"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT  Server port (default: 3000)"
    echo ""
    echo "Environment variables:"
    echo "  BIOWEB_PORT  - Server port (overridden by -p)"
    echo ""
    echo "Examples:"
    echo "  $0 start -p 8080"
    echo "  $0 restart --port 3001"
    exit 1
    ;;
esac
