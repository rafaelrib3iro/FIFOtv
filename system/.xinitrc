#!/bin/bash
# FIFOtv v2 — Xorg setup only (Electron starts via systemd)
xset s off
xset -dpms
xset s noblank
xrdb -merge <<< "Xcursor.theme: fifotv
Xcursor.size: 32"
unclutter -idle 3 &
exec sleep infinity
