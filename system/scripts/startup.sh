#!/bin/bash

/home/tv/smarttv/system/scripts/bluetooth-watch.sh &

cd /home/tv/smarttv/backend && python3 app.py &
