---
plan name: electron-migration
plan description: Migrate FIFOtv from Chromium+Flask to Electron
plan status: active
---

## Idea
Migrar o projeto FIFOtv do stack v1 (Chromium + Flask + Openbox + extensão Chrome) para v2 (Electron). O Electron substitui Chromium, Openbox, Flask e a extensão Chrome num único runtime. A homepage HTML/CSS/JS existente é reutilizada com chamadas IPC em vez de HTTP fetch. Serviços de Bluetooth e Wi-Fi migram de subprocess+PTY para D-Bus nativo (dbus-next). Menu contexto e overlays usam BrowserView transparente sobre streams. D-pad e controles remotos usam globalShortcut + before-input-event para nunca perder foco. O all-in-one Positivo UD3630 continua funcionando com git pull && npm start.

## Implementation
- Criar branch 'electron' a partir de main e tag v1.0
- Criar package.json com dependências (electron, dbus-next, electron-builder) e scripts (dev, start, build, dist)
- Criar diretório electron/ e criar main.js — app lifecycle, BrowserWindow kiosk, carregar index.html via file://, TV identity (user-agent, Sec-CH-UA headers, navigator overrides via executeJavaScript)
- Criar electron/preload.js — bridge IPC exposto como window.fifotv.* com todas as APIs (streamings CRUD, volume, system info/stats/shutdown/reboot/restart, wifi status/scan/connect, bluetooth status/scan/connect/disconnect, navigation openStreaming/goHome, eventos onVolumeChange/onBtStatusChange)
- Criar electron/services/bluetooth.js — BlueZ via D-Bus (dbus-next): getStatus, scan (StartDiscovery/SetDiscoveryFilter incluindo BLE), pair, connect, disconnect. Substitui PTY hack com bluetoothctl
- Criar electron/services/wifi.js — NetworkManager via D-Bus (dbus-next) ou fallback nmcli: getStatus, scan, connect com password. Mais robusto que subprocess.run
- Criar electron/services/volume.js — wpctl via child_process: up/down/mute/getVolume. Compatível com WirePlumber no Debian 13
- Criar electron/services/system.js — systemctl poweroff/reboot, app.relaunch, getLocalIP via os.networkInterfaces(), getCpuUsage/readStat via /proc, getDiskUsage via df
- Criar electron/services/streamings.js — CRUD streamings lendo/escrevendo streamings.json, com getStreamings, addStreaming, removeStreaming, reorderStreamings
- Adaptar frontend/script.js — substituir TODAS as chamadas fetch(BASE_URL+'/api/...') por window.fifotv.* (IPC). Remover const BASE_URL. Adaptar showTransition() para chamar window.fifotv.openStreaming() em vez de window.location.href. Adaptar context menu para chamar window.fifotv.goHome(). Adaptar resetScreensaverTimers para chamar window.fifotv.volumeDpmsOff()
- Adaptar frontend/index.html — adicionar preload script tag, remover navigator overrides inline (agora feito no main.js), remover oncontextmenu='return false' do body
- Testar homepage no Fedora com npm run dev — grid, navegação D-pad, context menu, settings popup, todas as seções
- Criar electron/views/overlay.js e overlay.html — BrowserView transparente para menu contexto, volume toast e notificações sobre streaming. Usar setBackgroundCGColor transparente e setBounds dinâmico
- Implementar streaming windows — openStreaming() cria BrowserWindow nova (destrói homepage pra liberar RAM), goHome() destrói streaming e recria homepage. Fade transitions entre windows
- Implementar D-pad global — globalShortcut para VolumeUp/Down/Mute, before-input-event para BrowserBack (click vs hold), Home, teclas F1/F5/F8/F9/F12. Nunca perde foco em iframes
- Implementar TV identity completa — setUserAgent com Tizen, onBeforeSendHeaders para Sec-CH-UA-Platform/Mobile/Form-Factors, executeJavaScript para navigator.platform/webdriver overrides em todas as webContents
- Testar tudo no Fedora com npm run dev — simular uso real com streamings, volume, bluetooth, wi-fi
- Git push — commit todos os arquivos novos e alterados, push pro branch electron no GitHub
- Testar no all-in-one — git pull && npm start, testar hardware real (air mouse, D-pad, tela, BT)
- Corrigir bugs de hardware no all-in-one e push correções
- Atualizar system/install/install.sh — adaptar para Electron (instalar Node.js 22.x, npm install, systemd service em vez de Openbox+Chromium+Flask)
- Atualizar system/.xinitrc — simplificar para só xset + npm start (remover Openbox, Chromium, Flask)
- Tag v2.0 — git tag v2.0 quando estável

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->