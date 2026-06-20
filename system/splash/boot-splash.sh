#!/bin/bash
# FIFOtv Boot Splash
# Shows logo on framebuffer before X/Openbox starts
# Requires: fbi (apt install fbi)

LOGO="/home/tv/smarttv/frontend/assets/splash-bg.png"

# Show on all available TTYs
for tty in /dev/tty{1..6}; do
    if [ -e "$tty" ]; then
        fbi -T 1 -noverbose "$LOGO" 2>/dev/null &
    fi
done

# Wait for X to start, then kill fbi
while ! pgrep -x "Xorg\|X\|openbox" > /dev/null 2>&1; do
    sleep 0.5
done

killall fbi 2>/dev/null
