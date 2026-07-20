#!/bin/bash
set -e
cd "$(dirname "$0")/.."
FIFOtv_RUNTIME_PROFILE=macos npm run dev
