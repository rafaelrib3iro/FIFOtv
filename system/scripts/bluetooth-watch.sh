#!/bin/bash
BT_MAC="${BT_MAC:-AA:BB:CC:DD:EE:FF}"

while true; do
    if bluetoothctl info "$BT_MAC" | grep -q "Connected: no"; then
        bluetoothctl connect "$BT_MAC" 2>/dev/null
    fi
    sleep 30
done
