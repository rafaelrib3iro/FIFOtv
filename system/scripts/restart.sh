#!/bin/bash
# FIFOtv full restart script
# Kills Flask + Chromium, then starts Flask
# Chromium will be auto-started by the Flask watchdog

PROJECT_DIR="/home/tv/smarttv"

# 1. Kill Chromium
pkill -f '/usr/lib/chromium/chromium ' 2>/dev/null
sleep 1

# 2. Show splash logo on root window + hide cursor
DISPLAY=:0 unclutter -idle 0 &
DISPLAY=:0 feh --bg-scale /home/tv/smarttv/frontend/assets/splash-bg.png &

# 2. Kill Flask (SIGTERM primeiro, SIGKILL fallback)
FLASK_PID=$(pgrep -f 'python3.*app\.py' -o 2>/dev/null)
if [ -n "$FLASK_PID" ]; then
    sync
    kill "$FLASK_PID" 2>/dev/null
    sleep 2
    kill -0 "$FLASK_PID" 2>/dev/null && kill -9 "$FLASK_PID" 2>/dev/null
fi
sleep 2

# 3. Aguarda porta 5000 liberar
while ss -tlnp | grep -q ':5000'; do sleep 0.5; done

# 4. Start Flask
cd "$PROJECT_DIR/backend"
nohup python3 app.py > /dev/null 2>&1 &
disown

# 5. Chromium sobe automático pelo watchdog (~5s)
