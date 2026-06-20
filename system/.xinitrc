#!/bin/bash

xset s off
xset -dpms
xset s noblank

unclutter -idle 1 &

/home/tv/smarttv/system/scripts/bluetooth-watch.sh &

cd /home/tv/smarttv/backend && python3 app.py &

sleep 3

openbox-session &

sleep 1

chromium \
  --app=http://localhost:5000 \
  --kiosk \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --enable-spatial-navigation \
  --lang=pt-BR \
  --disable-features=Translate,TranslateUI,AutomationControlled \
  --disable-blink-features=AutomationControlled \
  --load-extension=/home/tv/smarttv/frontend/extensions/tv-override \
  --user-agent="Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36" &

wait
