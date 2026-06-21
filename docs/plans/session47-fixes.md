---
plan name: session47-fixes
plan description: Bug fixes for Sessions 1-4.5
plan status: done
---

## Idea
Fix 9 bugs from Sessions 1-4.5: loading icons cropped, black icons not white, D-pad settings navigation, input popup missing, mouse clicks blocked by overlay, monitor popup in streaming, splash screen not loading, screensaver transparent, DRM/Widevine. Each fix applied sequentially with npm run dev testing between them.

## Implementation
- Fix 3: Change object-fit: cover to contain in loading.html inline img style
- Fix 4: Add filter: brightness(0) invert(1) to loading.html img inline style
- Fix 7: Fix D-pad ArrowRight transition from settings-sidebar to settings-content in script.js
- Fix 8: Ensure showWifiPasswordModal works with D-pad navigation (tabindex, focus)
- Fix 1: Test without overlay temporarily, then fix mouse passthrough (setIgnoreMouseEvents + bounds)
- Fix 5: Implement monitor popup in overlay (HTML + getStats IPC + preload-overlay.js)
- Fix 6: Update splash.html to work standalone, load it in main.js before homeView
- Fix 9: Add background: #000 to .screensaver CSS class
- Fix 2: Stop before implementing — discuss DRM/Widevine alternatives with user
- Update docs/SESSION-PLAN.md marking completed fixes with checkmarks

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->