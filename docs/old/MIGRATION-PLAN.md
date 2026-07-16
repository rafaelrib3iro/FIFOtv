# FIFOtv — Plano de Migração v1 → v2 (Electron)

## Contexto

### Stack Atual (v1)
```
Debian 13 → Xorg → Openbox → Chromium (kiosk) → Flask (porta 5000)
                                                 → Extension (tv-override)
                                                 → HTML/CSS/JS (homepage)
```

**Problemas conhecidos:**
- Openbox é overhead desnecessário (só maximiza Chromium)
- Flask como backend de sistema é frágil (subprocess.run pra tudo)
- Bluetooth via PTY hack (`script -qc bluetoothctl`) — frágil
- Duplicação de código: context menu, volume toast, toasts existem 2x (extension + script.js)
- Menu de contexto falha em iframes cross-origin (bug #11)
- D-pad perde foco em iframes e popups (bug #5)
- Chromium consome ~500-800MB RAM pra homepage
- Transições com flash preto (window.location.href)
- Comunicação frontend↔backend via HTTP fetch com ~50-100ms overhead

### Stack Nova (v2)
```
Debian 13 → Xorg → Electron (shell)
                     ├── Main Process (Node.js: sistema, janelas, IPC)
                     ├── BrowserWindow homepage (renderer)
                     ├── BrowserWindow streaming (quando ativo)
                     └── BrowserView overlay (menu, toasts, volume)
```

**O que resolve:**
- Elimina Flask, Openbox, extensão Chrome — tudo num processo
- Bluetooth/Wi-Fi via D-Bus nativo (dbus-next) — robusto
- Menu de contexto funciona 100% (BrowserView overlay sobre qualquer conteúdo)
- D-pad via globalShortcut — nunca perde foco
- RAM: ~210MB (vs ~385MB atual)
- Boot: ~5s (vs ~10s atual)
- Transições suaves (fade entre windows)
- Comunicação via IPC (~1-5ms vs ~50-100ms HTTP)

---

## Estrutura de Arquivos

### O que CRIAR
```
smarttv/
├── package.json                    # Dependências Electron + scripts
├── electron/
│   ├── main.js                     # Main process: janelas, app lifecycle
│   ├── preload.js                  # Bridge seguro renderer↔main
│   ├── services/
│   │   ├── bluetooth.js            # BlueZ via D-Bus (dbus-next)
│   │   ├── wifi.js                 # NetworkManager via D-Bus
│   │   ├── volume.js               # PipeWire via wpctl
│   │   ├── system.js               # systemctl, power, stats
│   │   └── streamings.js           # CRUD streamings (lê/escreve JSON)
│   └── views/
│       ├── overlay.js              # BrowserView: menu contexto, toasts, volume
│       └── overlay.html            # HTML do overlay
```

### O que MANTER (com adaptações)
```
smarttv/
├── frontend/
│   ├── index.html                  # Homepage (adicionar preload script)
│   ├── script.js                   # Substituir fetch() por IPC calls
│   ├── style.css                   # Sem alterações
│   ├── splash.html                 # Sem alterações
│   ├── FIFOtv.svg
│   ├── favicon.svg
│   └── assets/                     # Fonts, icons, sounds, splash-bg
├── system/
│   ├── install/                    # Instalador (adaptar pra Electron)
│   └── .xinitrc                    # Simplificar (só xset + electron)
├── docs/
└── HANDOFF.md
```

### O que DELETAR
```
smarttv/
├── backend/                        # Todo o Flask (app.py, requirements.txt)
│   ├── app.py                      # Substituído por electron/main.js
│   ├── bluetooth_manager.py        # Substituído por electron/services/bluetooth.js
│   └── requirements.txt            # Substituído por package.json
├── frontend/extensions/tv-override/ # Toda a extensão Chrome
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   ├── ui-overlay.js
│   ├── ui-overlay.css
│   └── rules.json
├── system/openbox/rc.xml           # Openbox não é mais necessário
├── system/scripts/
│   ├── bluetooth-watch.sh          # Substituído por D-Bus no Electron
│   ├── restart.sh                  # Substituído por app.relaunch()
│   └── startup.sh                  # Substituído por electron/main.js
└── system/splash/                  # Boot splash via Electron (não systemd)
```

---

## Arquitetura Electron

### Main Process (`electron/main.js`)

Responsabilidades:
- Gerenciar app lifecycle (ready, window-all-closed, activate)
- Criar/destruir BrowserWindows (homepage, streaming)
- Registrar globalShortcuts (D-pad, volume, back, home)
- Servir IPC handlers (bluetooth, wifi, volume, system, streamings)
- Injetar TV identity em todas as webContents
- Recovery automático de crash

```javascript
// Estrutura conceitual
const { app, BrowserWindow, globalShortcut, ipcMain, BrowserView } = require('electron');

let homeWindow = null;
let streamingWindow = null;
let overlayView = null;

app.whenReady().then(() => {
  createHomeWindow();
  registerGlobalShortcuts();
  registerIpcHandlers();
});

function createHomeWindow() {
  homeWindow = new BrowserWindow({
    kiosk: true,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  homeWindow.loadFile('frontend/index.html');
}

function openStreaming(url, name) {
  // Destruir homepage pra liberar RAM
  if (homeWindow) { homeWindow.destroy(); homeWindow = null; }

  streamingWindow = new BrowserWindow({
    kiosk: true,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-streaming.js'),
      contextIsolation: true,
    }
  });
  streamingWindow.loadURL(url);

  // Overlay com menu/toasts por cima
  overlayView = new BrowserView({ webPreferences: { contextIsolation: true } });
  streamingWindow.setBrowserView(overlayView);
  overlayView.setBounds({ x: 0, y: 0, width: 1280, height: 720 });
  overlayView.webContents.loadFile('electron/views/overlay.html');
  overlayView.webContents.setBackgroundCGColor(/* transparent */);
}

function goHome() {
  if (streamingWindow) { streamingWindow.destroy(); streamingWindow = null; }
  if (overlayView) { overlayView = null; }
  createHomeWindow();
}
```

### Preload Script (`electron/preload.js`)

Bridge seguro entre renderer (homepage) e main process:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fifotv', {
  // Streamings
  getStreamings: () => ipcRenderer.invoke('streamings:get'),
  addStreaming: (data) => ipcRenderer.invoke('streamings:add', data),
  removeStreaming: (id) => ipcRenderer.invoke('streamings:remove', id),
  reorderStreamings: (list) => ipcRenderer.invoke('streamings:reorder', list),

  // Sistema
  shutdown: () => ipcRenderer.invoke('system:shutdown'),
  reboot: () => ipcRenderer.invoke('system:reboot'),
  restartApp: () => ipcRenderer.invoke('system:restart'),
  updateApp: () => ipcRenderer.invoke('system:update'),
  getStats: () => ipcRenderer.invoke('system:stats'),
  getInfo: () => ipcRenderer.invoke('system:info'),

  // Volume
  volumeUp: () => ipcRenderer.invoke('volume:up'),
  volumeDown: () => ipcRenderer.invoke('volume:down'),
  volumeMute: () => ipcRenderer.invoke('volume:mute'),
  getVolume: () => ipcRenderer.invoke('volume:get'),

  // Wi-Fi
  wifiStatus: () => ipcRenderer.invoke('wifi:status'),
  wifiScan: () => ipcRenderer.invoke('wifi:scan'),
  wifiConnect: (ssid, pass) => ipcRenderer.invoke('wifi:connect', ssid, pass),

  // Bluetooth
  btStatus: () => ipcRenderer.invoke('bt:status'),
  btScan: () => ipcRenderer.invoke('bt:scan'),
  btConnect: (mac) => ipcRenderer.invoke('bt:connect', mac),
  btDisconnect: (mac) => ipcRenderer.invoke('bt:disconnect', mac),

  // Navegação
  openStreaming: (url, name) => ipcRenderer.invoke('nav:open-streaming', url, name),
  goHome: () => ipcRenderer.invoke('nav:go-home'),

  // Eventos do main process
  onVolumeChange: (cb) => ipcRenderer.on('volume:changed', (_, data) => cb(data)),
  onBtStatusChange: (cb) => ipcRenderer.on('bt:status-changed', (_, data) => cb(data)),
});
```

### Adaptações no `frontend/script.js`

Substituir todas as chamadas HTTP por IPC:

```javascript
// ANTES (Flask HTTP)
const res = await fetch(`${BASE_URL}/api/streamings`);
const data = await res.json();

// DEPOIS (Electron IPC)
const data = await window.fifotv.getStreamings();
```

```javascript
// ANTES
await fetch(`${BASE_URL}/api/system/shutdown`, { method: 'POST', headers: {...} });

// DEPOIS
await window.fifotv.shutdown();
```

```javascript
// ANTES
const res = await fetch(`${BASE_URL}/api/volume/up`);

// DEPOIS
await window.fifotv.volumeUp();
```

Todas as chamadas em `script.js` que usam `fetch(BASE_URL + '/api/...')` devem ser substituídas pela chamada IPC equivalente do `window.fifotv.*`.

### TV Identity (substituindo a extensão)

No `main.js`, aplicar em todas as webContents:

```javascript
app.on('web-contents-created', (_, contents) => {
  // User-Agent
  contents.session.setUserAgent('Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36');

  // Headers Sec-CH-UA
  contents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['Sec-CH-UA-Platform'] = '"Tizen"';
    details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
    details.requestHeaders['Sec-CH-UA-Form-Factors'] = '"TV"';
    callback({ requestHeaders: details.requestHeaders });
  });

  // Injetar navigator overrides em cada página
  contents.on('did-finish-load', () => {
    contents.executeJavaScript(`
      Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) ...' });
      Object.defineProperty(navigator, 'platform', { get: () => 'Tizen' });
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // ... resto dos overrides do content.js
    `);
  });
});
```

### Menu de Contexto e Overlays

Usar `BrowserView` transparente sobre o streaming:

```javascript
// No main process, quando abre streaming:
const overlayView = new BrowserView({
  webPreferences: { contextIsolation: true, nodeIntegration: false }
});
streamingWindow.setBrowserView(overlayView);
overlayView.setBounds({ x: 0, y: 0, width: 0, height: 0 }); // invisível por padrão
overlayView.webContents.loadFile('electron/views/overlay.html');
overlayView.webContents.setBackgroundCGColor(/* transparent */);

// Quando precisa mostrar menu:
ipcMain.on('overlay:show-menu', (_, x, y) => {
  overlayView.setBounds({ x: 0, y: 0, width: 1280, height: 720 });
  overlayView.webContents.send('show-menu', { x, y });
});

// Quando fecha menu:
ipcMain.on('overlay:hide-menu', () => {
  overlayView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
});
```

O overlay.html contém o menu de contexto, volume toast e notificações — idêntico ao `ui-overlay.css/js` atual, mas servido pelo Electron ao invés de extensão.

### D-pad / Controles

```javascript
// No main process
globalShortcut.register('VolumeUp', () => { /* volume up */ });
globalShortcut.register('VolumeDown', () => { /* volume down */ });
globalShortcut.register('AudioVolumeMute', () => { /* mute */ });

// Teclas que globalShortcut não captura (air mouse custom):
// Usar before-input-event na janela ativa
function registerInputHandlers(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'BrowserBack') {
      if (input.type === 'keyDown') startBackTimer();
      if (input.type === 'keyUp') handleBackRelease();
      event.preventDefault();
    }
    if (input.key === 'Home') {
      goHome();
      event.preventDefault();
    }
    // ... outras teclas
  });
}
```

### Serviços de Sistema

#### Bluetooth (`electron/services/bluetooth.js`)
```javascript
const dbus = require('dbus-next');

async function getBluetooth() {
  const bus = dbus.sessionBus();
  const obj = await bus.getProxyObject('org.bluez', '/org/bluez/hci0');
  const adapter = obj.getInterface('org.bluez.Adapter1');
  // Usar interfaces D-Bus do BlueZ diretamente
}

// StartDiscovery, Pair, Connect, Disconnect — tudo via D-Bus
// Sem PTY hack, sem bluetoothctl, sem parsing de output
```

#### Wi-Fi (`electron/services/wifi.js`)
```javascript
const dbus = require('dbus-next');

async function getWifi() {
  const bus = dbus.systemBus();
  const obj = await bus.getProxyObject('org.freedesktop.NetworkManager', '/org/freedesktop/NetworkManager');
  const nm = obj.getInterface('org.freedesktop.NetworkManager');
  // Scan, connect, status — tudo via D-Bus
}
```

#### Volume (`electron/services/volume.js`)
```javascript
const { execSync } = require('child_process');

module.exports = {
  up: () => { execSync('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+'); return get(); },
  down: () => { execSync('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-'); return get(); },
  mute: () => { execSync('wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle'); return get(); },
  get: () => {
    const out = execSync('wpctl get-volume @DEFAULT_AUDIO_SINK@').toString();
    const vol = parseFloat(out.split(':')[1]);
    const muted = out.includes('[MUTED]');
    return { volume: Math.round(vol * 100), muted };
  }
};
```

#### System (`electron/services/system.js`)
```javascript
const { execSync } = require('child_process');
const os = require('os');

module.exports = {
  shutdown: () => execSync('systemctl poweroff'),
  reboot: () => execSync('systemctl reboot'),
  restart: () => { app.relaunch(); app.exit(0); },
  getInfo: () => ({ ip: getLocalIP(), hostname: os.hostname() }),
  getStats: () => ({
    cpu: getCpuUsage(),
    ram_used: (os.totalmem() - os.freemem()) / 1073741824,
    ram_total: os.totalmem() / 1073741824,
    disk: getDiskUsage(),
    processes: getProcessCount(),
  }),
};
```

---

## package.json

```json
{
  "name": "fifotv",
  "version": "2.0.0",
  "description": "FIFOtv — Smart TV kiosk",
  "main": "electron/main.js",
  "scripts": {
    "dev": "electron .",
    "start": "electron . --kiosk",
    "build": "electron-builder --linux deb",
    "dist": "electron-builder --linux AppImage"
  },
  "dependencies": {
    "dbus-next": "^0.10.2"
  },
  "devDependencies": {
    "electron": "^35.0.0",
    "electron-builder": "^26.0.0"
  },
  "build": {
    "appId": "com.fifotv.app",
    "productName": "FIFOtv",
    "linux": {
      "target": ["deb", "AppImage"],
      "category": "AudioVideo"
    },
    "files": [
      "electron/**/*",
      "frontend/**/*",
      "package.json"
    ]
  }
}
```

---

## ISO e Instalação

### Atualização do install.sh

O instalador agora faz:

```bash
# 1. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 2. Clonar repo
git clone https://github.com/rafaelrib3iro/FIFOtv.git /home/tv/smarttv

# 3. Instalar dependências
cd /home/tv/smarttv
npm install

# 4. Build (opcional, pra production)
npm run build

# 5. Configurar systemd service
cat > /etc/systemd/system/fifotv.service << EOF
[Unit]
Description=FIFOtv
After=graphical.target

[Service]
User=tv
Environment=DISPLAY=:0
ExecStart=/usr/bin/electron /home/tv/smarttv --kiosk
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
EOF

systemctl enable fifotv
```

### Atualização do .xinitrc

```bash
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0 &
cd /home/tv/smarttv && npm start
```

---

## Fluxo de Desenvolvimento

```
PC Fedora (dev)                    All-in-one (test)
─────────────────                  ──────────────────
npm run dev                        git pull
(janela Electron local)            npm start
testa UI, lógica, layout           testa hardware real
                                   (air mouse, TV, D-pad)
     │                                    │
     └── git push ──→ GitHub ←── git push ──┘
```

---

## Passos de Migração (ordem)

| # | Passo | Onde | Descrição |
|---|-------|------|-----------|
| 1 | Criar `package.json` | Fedora | Dependências Electron + dbus-next + scripts |
| 2 | Criar `electron/main.js` | Fedora | App lifecycle, janela homepage, kiosk |
| 3 | Criar `electron/preload.js` | Fedora | Bridge IPC (todas as APIs) |
| 4 | Adaptar `frontend/script.js` | Fedora | Substituir fetch() por window.fifotv.* |
| 5 | Testar homepage no Fedora | Fedora | `npm run dev` — grid, navegação, popups |
| 6 | Migrar Bluetooth pra D-Bus | Fedora | `electron/services/bluetooth.js` |
| 7 | Migrar Wi-Fi pra D-Bus | Fedora | `electron/services/wifi.js` |
| 8 | Implementar Volume + System | Fedora | `electron/services/volume.js` + `system.js` |
| 9 | Implementar streaming windows | Fedora | Abrir/fechar streaming em BrowserWindow |
| 10 | Implementar overlay | Fedora | Menu contexto + toasts via BrowserView |
| 11 | Implementar D-pad global | Fedora | globalShortcut + before-input-event |
| 12 | Implementar TV identity | Fedora | setUserAgent + executeJavaScript |
| 13 | Testar tudo no Fedora | Fedora | `npm run dev` — simular uso real |
| 14 | Git push | Fedora | Commit + push pro GitHub |
| 15 | Testar no all-in-one | All-in-one | `git pull && npm start` |
| 16 | Corrigir bugs de hardware | All-in-one | Air mouse, D-pad, tela, BT |
| 17 | Git push correções | All-in-one | Push fixes pro GitHub |
| 18 | Git pull correções | Fedora | Pull fixes |
| 19 | Atualizar install.sh | Fedora | Adaptar pra Electron |
| 20 | Build ISO | Fedora | ISO com preseed + install.sh |
| 21 | Tag v2.0 | Fedora | `git tag v2.0` |

---

## Rollback

- O código v1 fica no branch `main` (tag `v1.0`)
- Migração acontece no branch `electron`
- Quando estável, merge `electron` → `main`
- Se der ruim: `git checkout main` volta pro v1

---

## Dependências

### npm (package.json)
- `electron` (dev) — runtime
- `electron-builder` (dev) — build .deb/.AppImage
- `dbus-next` — Bluetooth + Wi-Fi via D-Bus

### Sistema (apt)
- `nodejs` (22.x)
- `npm`
- `wireplumber` (wpctl pra volume)
- `bluez` (stack Bluetooth)
- `network-manager` (Wi-Fi)
- `xorg`
- `unclutter` (esconder cursor)
