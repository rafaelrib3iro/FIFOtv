#!/bin/bash
# FIFOtv v2 — Xorg setup only (Electron starts via systemd)
xset s off
xset +dpms
xset dpms 0 0 3600
xset s noblank
unclutter -idle 3 &
exec sleep infinity
