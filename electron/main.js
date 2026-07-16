const { app, BrowserWindow, WebContentsView, globalShortcut, ipcMain, screen, session, components, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execFile, spawn } = require('child_process');
const http = require('http');
const os = require('os');
const net = require('net');
const { isCatalog, isMacAddress, isNonEmptyString, isStreaming, isStreamingUrl } = require('./ipc-validation');
const { readCatalog } = require('./catalog');
const { clamp, parseNmcliTerse } = require('./system-controls');
const { isCurrentView } = require('./view-lifecycle');
const { hostnameFromUrl, matchesHostname, resolveCustomScript } = require('./provider-resolution');
const { redactStreamingUrl, runInjectionStages } = require('./streaming-injection');
const { createClientHintsRegistry } = require('./client-hints');
const { createNetworkErrorRegistry, redactUrl } = require('./runtime-logging');

// Logging configuration
const LOG_CONFIG_PATH = path.join(__dirname, '..', 'config', 'logging.json');
function loadLogConfig() {
  try {
    return JSON.parse(fs.readFileSync(LOG_CONFIG_PATH, 'utf8'));
  } catch {
    return { enabled: true, level: 'info', file: '/var/log/fifotv/main.log', maxSize: 5242880, consoleOutput: false };
  }
}
const logConfig = loadLogConfig();

let log = null;
if (logConfig.enabled) {
  log = require('electron-log/main');
  log.initialize({ preload: true });
  log.transports.file.resolvePathFn = () => logConfig.file;
  log.transports.file.level = logConfig.level;
  log.transports.file.maxSize = logConfig.maxSize;
  log.transports.console.level = logConfig.consoleOutput ? logConfig.level : false;
  log.transports.ipc.level = logConfig.level;
}

let win = null;
let homeView = null;
let streamingView = null;
let overlayView = null;
let loadingView = null;
let splashView = null;
let loadingTimer = null;
let appCommandAttached = false;
let overlayMenuVisible = false;
let overlayAttached = false;
let remoteProcess = null;
let remoteRunning = false;
let remoteHealthTimer = null;
let currentStreamingSlug = null;
let powerSaveBlockerId = null;
let streamingGeneration = 0;
let returningHome = false;
let removeStreamingClientHints = null;
const DATA_PATH = path.join(__dirname, '..', 'backend', 'streamings.json');
const CUSTOM_DIR = path.join(__dirname, 'views', 'streaming-customizations');
const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'settings.json');
const SPA_DOMAINS = new Set(['youtube']);
const clientHintsRegistry = createClientHintsRegistry();
const networkErrorRegistry = createNetworkErrorRegistry((details) => {
  log?.warn(`[Network:${details.label}]`, details.method, details.url, '->', details.error);
});
const SMART_TV_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
const SMART_TV_CLIENT_HINTS = {
  'Sec-CH-UA-Platform': '"Tizen"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA': '"Chromium";v="149", "Not_A Brand";v="24"',
  'Sec-CH-UA-Full-Version-List': '"Chromium";v="149.0.0.0", "Not_A Brand";v="24.0.0.0"',
  'Sec-CH-UA-Platform-Version': '"6.5.0"',
  'Sec-CH-UA-Model': '""',
  'Sec-CH-UA-Form-Factors': '"TV"',
};

function loadFreshConfig(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  delete require.cache[require.resolve(fullPath)];
  return require(fullPath);
}

const getStreamingConfig = () => loadFreshConfig('./views/streaming-customizations/config');
const getSpatialNavConfig = () => loadFreshConfig('./views/spatial-navigation/config');

// ─── CHROMIUM SWITCHES (must be before app.whenReady) ────────
// Spatial navigation disabled — polyfill injected per-streaming via executeJavaScript
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('gtk-version', '3'); // Avoid GTK 4 issues on Debian/GNOME

function readStreamings() {
  return readCatalog(() => fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeStreamings(data) {
  assertPayload(isCatalog(data), 'catalog');
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, output: stdout || stderr || '' });
    });
  });
}

function runFile(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, output: stdout || stderr || '' });
    });
  });
}

function getViewBounds() {
  if (!screen) return { width: 1280, height: 720 };
  const { width, height } = screen.getPrimaryDisplay().bounds;
  return { width, height };
}

function addView(view) {
  if (!win || win.isDestroyed() || !view) return;
  const { width, height } = getViewBounds();
  view.setBounds({ x: 0, y: 0, width, height });
  win.contentView.addChildView(view);
}

function removeView(view) {
  if (!win || win.isDestroyed() || !view) return;
  try { win.contentView.removeChildView(view); } catch {}
}

function showOverlay() {
  if (!isOverlayAlive() || !win || win.isDestroyed() || overlayAttached) return;
  win.contentView.addChildView(overlayView);
  overlayAttached = true;
}

function hideOverlay() {
  if (!overlayAttached) return;
  removeView(overlayView);
  overlayAttached = false;
}

function isAuthorizedSender(event, views) {
  return views.some((view) => view && !view.webContents.isDestroyed()
    && event.sender === view.webContents
    && event.senderFrame === event.sender.mainFrame);
}

function handleFrom(channel, getViews, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isAuthorizedSender(event, getViews())) {
      throw new Error(`Unauthorized IPC sender for ${channel}`);
    }
    return handler(event, ...args);
  });
}

function onFrom(channel, getViews, listener) {
  ipcMain.on(channel, (event, ...args) => {
    if (!isAuthorizedSender(event, getViews())) return;
    listener(event, ...args);
  });
}

function protectLocalView(view) {
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      console.warn(`[FIFOtv] Blocked local view navigation to ${redactUrl(url)}`);
    }
  });
}

function assertPayload(condition, message) {
  if (!condition) throw new TypeError(`Invalid IPC payload: ${message}`);
}

// ─── STREAMINGS ────────────────────────────────────────────
handleFrom('streamings:get', () => [homeView], () => {
  return readStreamings();
});

handleFrom('streamings:add', () => [homeView], (_, data) => {
  assertPayload(isStreaming(data), 'streaming');
  const db = readStreamings();
  assertPayload(!db.streamings.some((streaming) => streaming.id === data.id), 'duplicate streaming id');
  db.streamings.push(data);
  writeStreamings(db);
  return { ok: true };
});

handleFrom('streamings:remove', () => [homeView], (_, id) => {
  assertPayload(Number.isSafeInteger(id), 'streaming id');
  const db = readStreamings();
  db.streamings = db.streamings.filter(s => s.id !== id);
  writeStreamings(db);
  return { ok: true };
});

handleFrom('streamings:reorder', () => [homeView], (_, data) => {
  assertPayload(isCatalog(data), 'catalog');
  writeStreamings(data);
  return { ok: true };
});

// ─── SYSTEM ────────────────────────────────────────────────
handleFrom('system:shutdown', () => [homeView, overlayView], () => {
  exec('shutdown -h now');
  return { ok: true };
});

handleFrom('system:reboot', () => [homeView], () => {
  exec('shutdown -r now');
  return { ok: true };
});

handleFrom('system:restart', () => [homeView, overlayView], () => {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
  return { ok: true };
});

handleFrom('system:update', () => [homeView], () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'update.sh');
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: 'Script de atualização não encontrado' };
  }
  return new Promise((resolve) => {
    exec(`bash "${scriptPath}"`, { timeout: 180000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[Update] failed:', err.message);
        resolve({ ok: false, error: stderr || err.message });
      } else {
        console.log('[Update] success:', stdout);
        resolve({ ok: true, output: stdout });
      }
    });
  });
});

handleFrom('system:stats', () => [homeView, overlayView], async () => {
  try {
    const cpuRes1 = await run("grep 'cpu ' /proc/stat");
    await new Promise(r => setTimeout(r, 300));
    const cpuRes2 = await run("grep 'cpu ' /proc/stat");
    const memRes = await run("free -m");
    const diskRes = await run("df -BM / | tail -1");
    const procRes = await run("ls /proc | grep -c '^[0-9]'");

    let cpu = 0;
    if (cpuRes1.ok && cpuRes2.ok) {
      const p1 = cpuRes1.output.trim().split(/\s+/);
      const p2 = cpuRes2.output.trim().split(/\s+/);
      const idle1 = parseInt(p1[4]) || 0;
      const total1 = p1.slice(1).reduce((a, b) => a + (parseInt(b) || 0), 0);
      const idle2 = parseInt(p2[4]) || 0;
      const total2 = p2.slice(1).reduce((a, b) => a + (parseInt(b) || 0), 0);
      const idleDelta = idle2 - idle1;
      const totalDelta = total2 - total1;
      cpu = totalDelta > 0 ? Math.round(((totalDelta - idleDelta) / totalDelta) * 100) : 0;
    }

    let ram_used = 0, ram_total = 0;
    if (memRes.ok) {
      const lines = memRes.output.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        ram_total = parseInt(parts[1]) || 0;
        ram_used = parseInt(parts[2]) || 0;
      }
    }

    let disk_used = 0, disk_total = 0;
    if (diskRes.ok) {
      const parts = diskRes.output.trim().split(/\s+/);
      disk_total = parseInt(parts[1]) || 0;
      disk_used = parseInt(parts[2]) || 0;
    }

    return {
      cpu,
      ram_used,
      ram_total,
      disk_used,
      disk_total,
      processes: parseInt(procRes.output) || 0,
    };
  } catch {
    return { cpu: 0, ram_used: 0, ram_total: 0, disk_used: 0, disk_total: 0, processes: 0 };
  }
});

handleFrom('system:info', () => [homeView], () => {
  const interfaces = os.networkInterfaces();
  let ip = '127.0.0.1';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
  }
  return { ip, hostname: os.hostname() };
});

handleFrom('system:screen-off', () => [homeView], () => {
  exec('xset dpms force off');
  return { ok: true };
});

// ─── LOGGING CONTROL ─────────────────────────────────────────
// Console override for file logging
if (log) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => { log.info(...args); originalLog.apply(console, args); };
  console.error = (...args) => { log.error(...args); originalError.apply(console, args); };
  console.warn = (...args) => { log.warn(...args); originalWarn.apply(console, args); };
}

// Helper: attach critical error listeners to any WebContentsView
function attachRendererLogging(webContents, label) {
  if (!webContents || webContents.isDestroyed()) return;

  webContents.on('console-message', (event) => {
    const prefix = `[Renderer:${label}]`;
    if (event.level === 'error') log?.error(prefix, event.message);
    else if (event.level === 'warning') log?.warn(prefix, event.message);
    else if (event.level === 'debug') log?.debug(prefix, event.message);
    else log?.info(prefix, event.message);
  });

  webContents.on('did-fail-load', (event, code, desc, url, isMainFrame) => {
    log?.error(`[Renderer:${label}] did-fail-load`, { code, desc, url: redactUrl(url), isMainFrame });
  });

  webContents.on('render-process-gone', (event, details) => {
    log?.error(`[Renderer:${label}] render-process-gone`, details);
  });

  webContents.on('preload-error', (event, preloadPath, error) => {
    log?.error(`[Renderer:${label}] preload-error`, { preloadPath, error });
  });

  webContents.on('unresponsive', () => log?.warn(`[Renderer:${label}] unresponsive`));
  webContents.on('responsive', () => log?.info(`[Renderer:${label}] responsive again`));

  const removeNetworkLogging = networkErrorRegistry.register(webContents.session, webContents.id, label);
  webContents.once('destroyed', removeNetworkLogging);
}

app.on('child-process-gone', (_, details) => {
  if (details.type === 'GPU') log?.error('[GPU] child-process-gone', details);
});

// IPC: runtime logging control
handleFrom('logging:get-status', () => [homeView], () => ({
  fileEnabled: logConfig.enabled,
  level: logConfig.level,
  file: logConfig.file,
  consoleOutput: logConfig.consoleOutput
}));

handleFrom('logging:set-enabled', () => [homeView], (_, enabled) => {
  assertPayload(typeof enabled === 'boolean', 'logging enabled');
  logConfig.enabled = enabled;
  fs.writeFileSync(LOG_CONFIG_PATH, JSON.stringify(logConfig, null, 2));
  return { ok: true, message: `Logging ${enabled ? 'enabled' : 'disabled'}. Restart app to apply.` };
});

handleFrom('logging:set-level', () => [homeView], (_, level) => {
  const validLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
  assertPayload(validLevels.includes(level), 'logging level');
  logConfig.level = level;
  fs.writeFileSync(LOG_CONFIG_PATH, JSON.stringify(logConfig, null, 2));
  return { ok: true, message: `Log level set to ${level}. Restart app to apply.` };
});

// ─── VOLUME (wpctl) ────────────────────────────────────────
async function getVolumeState() {
  const res = await run("wpctl get-volume @DEFAULT_AUDIO_SINK@");
  if (res.ok) {
    const match = res.output.match(/Volume:\s*([\d.]+)/);
    const vol = match ? clamp(Math.round(parseFloat(match[1]) * 100), 0, 100) : 50;
    const muted = res.output.includes('[MUTED]');
    return { ok: true, volume: vol, muted };
  }
  return { ok: false, error: res.output || 'Não foi possível obter o volume' };
}

async function changeVolume(command) {
  const result = await run(command);
  if (!result.ok) return { ok: false, error: result.output || 'Não foi possível alterar o volume' };
  return getVolumeState();
}

handleFrom('volume:up', () => [homeView, overlayView], () => {
  return changeVolume('wpctl set-volume --limit 1 @DEFAULT_AUDIO_SINK@ 5%+');
});

handleFrom('volume:down', () => [homeView, overlayView], () => {
  return changeVolume('wpctl set-volume --limit 1 @DEFAULT_AUDIO_SINK@ 5%-');
});

handleFrom('volume:mute', () => [homeView, overlayView], () => {
  return changeVolume('wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle');
});

handleFrom('volume:get', () => [homeView, overlayView], () => {
  return getVolumeState();
});

// ─── WIFI (nmcli) ──────────────────────────────────────────
handleFrom('wifi:status', () => [homeView], async () => {
  const res = await run("nmcli -t -f NAME,TYPE,DEVICE connection show --active");
  if (res.ok) {
    const wifiLine = res.output.split('\n').map(parseNmcliTerse).find((fields) => fields[1] === '802-11-wireless');
    if (wifiLine) {
      return { connected: true, ssid: wifiLine[0] };
    }
  }
  return { connected: false, ssid: '' };
});

handleFrom('wifi:scan', () => [homeView], async () => {
  const res = await run("nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list --rescan yes");
  if (res.ok) {
    const networks = res.output.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [ssid, signal, security] = parseNmcliTerse(line);
        return { ssid, signal: parseInt(signal) || 0, security: security || '' };
      })
      .filter(n => n.ssid);
    return { networks };
  }
  return { networks: [] };
});

handleFrom('wifi:connect', () => [homeView], async (_, ssid, password) => {
  assertPayload(isNonEmptyString(ssid), 'SSID');
  assertPayload(password === undefined || typeof password === 'string', 'Wi-Fi password');
  const args = ['dev', 'wifi', 'connect', ssid];
  if (password !== undefined) args.push('password', password);
  const res = await runFile('nmcli', args);
  return { ok: res.ok, output: res.output };
});

// ─── BLUETOOTH (dbus-next) ─────────────────────────────────
const dbusNext = require('dbus-next');
const { Interface: DbusInterface, DBusError } = dbusNext.interface;
const DbusVariant = dbusNext.Variant;

let btAdapter = null;
let btAgentRegistered = false;

function btSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function invalidateBtCache() {
  btAdapter = null;
  btAgentRegistered = false;
}

async function waitForBtProperty(bus, devicePath, iface, prop, expected, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const obj = await bus.getProxyObject('org.bluez', devicePath);
      const props = obj.getInterface('org.freedesktop.DBus.Properties');
      const val = await props.Get(iface, prop);
      if (val.value === expected) return true;
    } catch {}
    await btSleep(500);
  }
  return false;
}

// ─── PAIRING AGENT ─────────────────────────────────────────
class BluezAgent extends DbusInterface {
  constructor(name) { super(name); }
  Release() { console.log('[BT] Agent: Released'); }
  AuthorizeService(device, uuid) {}
  RequestPinCode(device) { throw new DBusError('org.bluez.Error.Rejected', 'not supported'); }
  RequestPasskey(device) { return 0; }
  DisplayPasskey(device, passkey, entered) {}
  DisplayPinCode(device, pincode) {}
  RequestConfirmation(device, passkey) { console.log('[BT] Agent: RequestConfirmation passkey=' + passkey); }
  RequestAuthorization(device) {}
  Cancel() { console.log('[BT] Agent: Cancel'); }
}

BluezAgent.configureMembers({
  methods: {
    Release:              { inSignature: '',  outSignature: '' },
    AuthorizeService:     { inSignature: 'os', outSignature: '' },
    RequestPinCode:       { inSignature: 'o',  outSignature: 's' },
    RequestPasskey:       { inSignature: 'o',  outSignature: 'u' },
    DisplayPasskey:       { inSignature: 'ouq', outSignature: '' },
    DisplayPinCode:       { inSignature: 'os', outSignature: '' },
    RequestConfirmation:  { inSignature: 'ou', outSignature: '' },
    RequestAuthorization: { inSignature: 'o',  outSignature: '' },
    Cancel:               { inSignature: '',  outSignature: '' },
  }
});

async function registerBtAgent(bus) {
  if (btAgentRegistered) return;
  try {
    const agent = new BluezAgent('org.bluez.Agent1');
    bus.export('/org/fifotv/agent', agent);
    const obj = await bus.getProxyObject('org.bluez', '/org/bluez');
    const agentMgr = obj.getInterface('org.bluez.AgentManager1');
    await agentMgr.RegisterAgent('/org/fifotv/agent', 'NoInputNoOutput');
    await agentMgr.RequestDefaultAgent('/org/fifotv/agent');
    btAgentRegistered = true;
    console.log('[BT] Agent registered');
  } catch (err) {
    console.error('[BT] Agent registration failed:', err.message);
    btAgentRegistered = false;
  }
}

async function findDevicePath(bus, mac) {
  const managed = await (await bus.getProxyObject('org.bluez', '/'))
    .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
  for (const [path, interfaces] of Object.entries(managed)) {
    if (interfaces['org.bluez.Device1']) {
      const d = interfaces['org.bluez.Device1'];
      if (d['Address'] && d['Address'].value === mac) {
        return path;
      }
    }
  }
  return null;
}

async function getBtAdapter() {
  if (btAdapter) return btAdapter;
  try {
    const systemBus = dbusNext.systemBus();
    const obj = await systemBus.getProxyObject('org.bluez', '/');
    const mgr = obj.getInterface('org.freedesktop.DBus.ObjectManager');
    const managed = await mgr.GetManagedObjects();
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Adapter1']) {
        btAdapter = { path, bus: systemBus };
        await registerBtAgent(systemBus);
        return btAdapter;
      }
    }
  } catch (err) {
    console.error('[BT] getBtAdapter failed:', err.message);
    invalidateBtCache();
  }
  return btAdapter;
}

handleFrom('bt:status', () => [homeView], async () => {
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { connected: false, name: '', mac: '', devices: [] };
    const obj = await adapter.bus.getProxyObject('org.bluez', adapter.path);
    const props = obj.getInterface('org.freedesktop.DBus.Properties');
    const powered = await props.Get('org.bluez.Adapter1', 'Powered');
    if (!powered.value) return { connected: false, name: '', mac: '', devices: [] };

    const managed = await (await adapter.bus.getProxyObject('org.bluez', '/'))
      .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
    const devices = [];
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Device1']) {
        const d = interfaces['org.bluez.Device1'];
        const connectedProp = d['Connected'];
        if (connectedProp && connectedProp.value) {
          devices.push({
            name: d['Name'] ? d['Name'].value : '',
            mac: d['Address'] ? d['Address'].value : '',
          });
        }
      }
    }
    const [first] = devices;
    return {
      connected: devices.length > 0,
      name: first?.name || '',
      mac: first?.mac || '',
      devices,
    };
  } catch (err) {
    console.error('[BT] bt:status failed:', err.message);
    invalidateBtCache();
    return { connected: false, name: '', mac: '', devices: [] };
  }
});

handleFrom('bt:scan', () => [homeView], async () => {
  let adapterIface = null;
  let props = null;
  let previousPairable;
  let previousDiscoverable;
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { devices: [] };
    const obj = await adapter.bus.getProxyObject('org.bluez', adapter.path);
    adapterIface = obj.getInterface('org.bluez.Adapter1');
    props = obj.getInterface('org.freedesktop.DBus.Properties');
    previousPairable = await props.Get('org.bluez.Adapter1', 'Pairable');
    previousDiscoverable = await props.Get('org.bluez.Adapter1', 'Discoverable');

    try { await adapterIface.StopDiscovery(); } catch {}

    await props.Set('org.bluez.Adapter1', 'Pairable', new DbusVariant('b', true));
    await props.Set('org.bluez.Adapter1', 'Discoverable', new DbusVariant('b', true));

    await adapterIface.StartDiscovery();
    await btSleep(3000);

    const managed = await (await adapter.bus.getProxyObject('org.bluez', '/'))
      .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
    const devices = [];
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Device1']) {
        const d = interfaces['org.bluez.Device1'];
        devices.push({
          name: d['Name'] ? d['Name'].value : '',
          mac: d['Address'] ? d['Address'].value : '',
        });
      }
    }

    return { devices };
  } catch (err) {
    console.error('[BT] bt:scan failed:', err.message);
    invalidateBtCache();
    return { devices: [] };
  } finally {
    if (adapterIface) {
      try { await adapterIface.StopDiscovery(); } catch {}
    }
    if (props && previousPairable) {
      try { await props.Set('org.bluez.Adapter1', 'Pairable', previousPairable); } catch {}
    }
    if (props && previousDiscoverable) {
      try { await props.Set('org.bluez.Adapter1', 'Discoverable', previousDiscoverable); } catch {}
    }
  }
});

handleFrom('bt:connect', () => [homeView], async (_, mac) => {
  assertPayload(isMacAddress(mac), 'Bluetooth MAC address');
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { ok: false, error: 'No adapter' };

    const devicePath = await findDevicePath(adapter.bus, mac);
    if (!devicePath) return { ok: false, error: 'Device not found' };

    const obj = await adapter.bus.getProxyObject('org.bluez', devicePath);
    const dev = obj.getInterface('org.bluez.Device1');
    const props = obj.getInterface('org.freedesktop.DBus.Properties');

    const connected = await props.Get('org.bluez.Device1', 'Connected');
    if (connected.value) return { ok: true };

    const paired = await props.Get('org.bluez.Device1', 'Paired');
    if (!paired.value) {
      try { await dev.Pair(); } catch (e) {
        if (!e.type || !e.type.includes('AlreadyExists')) {
          console.error('[BT] Pair failed:', e.type || e.message, e.text || '');
        }
      }
      const pairedOk = await waitForBtProperty(adapter.bus, devicePath, 'org.bluez.Device1', 'Paired', true);
      if (!pairedOk) return { ok: false, error: 'Pairing timeout' };
    }

    await props.Set('org.bluez.Device1', 'Trusted', new DbusVariant('b', true));

    try { await dev.Connect(); } catch (e) {
      if (!e.type || !e.type.includes('AlreadyConnected')) {
        return { ok: false, error: e.text || e.message };
      }
    }

    const connectedOk = await waitForBtProperty(adapter.bus, devicePath, 'org.bluez.Device1', 'Connected', true);
    if (!connectedOk) return { ok: false, error: 'Connection timeout' };

    return { ok: true };
  } catch (e) {
    console.error('[BT] bt:connect failed:', e.type || e.message);
    invalidateBtCache();
    return { ok: false, error: e.text || e.message };
  }
});

handleFrom('bt:disconnect', () => [homeView], async (_, mac) => {
  assertPayload(isMacAddress(mac), 'Bluetooth MAC address');
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { ok: false };

    const devicePath = await findDevicePath(adapter.bus, mac);
    if (!devicePath) return { ok: false };

    const obj = await adapter.bus.getProxyObject('org.bluez', devicePath);
    const dev = obj.getInterface('org.bluez.Device1');
    await dev.Disconnect();
    return { ok: true };
  } catch (err) {
    console.error('[BT] bt:disconnect failed:', err.message);
    invalidateBtCache();
    return { ok: false };
  }
});

handleFrom('bt:unpair', () => [homeView], async (_, mac) => {
  assertPayload(isMacAddress(mac), 'Bluetooth MAC address');
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { ok: false, error: 'No adapter' };

    const devicePath = await findDevicePath(adapter.bus, mac);
    if (!devicePath) return { ok: false, error: 'Device not found' };

    const obj = await adapter.bus.getProxyObject('org.bluez', adapter.path);
    const adapterIface = obj.getInterface('org.bluez.Adapter1');
    await adapterIface.RemoveDevice(devicePath);
    console.log('[BT] Unpaired:', mac);
    return { ok: true };
  } catch (e) {
    console.error('[BT] bt:unpair failed:', e.type || e.message);
    invalidateBtCache();
    return { ok: false, error: e.text || e.message };
  }
});

// ─── NAVIGATION ────────────────────────────────────────────
function isOverlayAlive() {
  return overlayView && !overlayView.webContents.isDestroyed();
}

function forwardToOverlay(input) {
  if (isOverlayAlive()) {
    overlayView.webContents.send('key-event', input);
  }
}

function resetHomeScreensaver() {
  if (homeView && !homeView.webContents.isDestroyed()) {
    homeView.webContents.send('screensaver:reset');
  }
}

function destroyStreamingViews() {
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
  streamingGeneration += 1;
  overlayMenuVisible = false;

  if (removeStreamingClientHints) {
    removeStreamingClientHints();
    removeStreamingClientHints = null;
  }

  if (overlayView) {
    hideOverlay();
    overlayView.webContents.destroy();
    overlayView = null;
  }
  if (streamingView) {
    removeView(streamingView);
    streamingView.webContents.destroy();
    streamingView = null;
  }
  if (loadingView) {
    removeView(loadingView);
    loadingView.webContents.destroy();
    loadingView = null;
  }
}

function isCurrentStreamingView(view, generation) {
  return isCurrentView(view, generation, streamingView, streamingGeneration);
}

function returnHome() {
  if (returningHome) return;
  returningHome = true;
  currentStreamingSlug = null;

  if (powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
  }

  if (appCommandAttached) {
    win.removeListener('app-command', handleAppCommand);
    appCommandAttached = false;
  }

  setImmediate(() => {
    destroyStreamingViews();
    returningHome = false;
    if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.focus();
      resetHomeScreensaver();
    }
  });
}

handleFrom('nav:open-streaming', () => [homeView], (_, url, name, slug) => {
  assertPayload(isStreamingUrl(url), 'streaming URL');
  assertPayload(isNonEmptyString(name), 'streaming name');
  assertPayload(typeof slug === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(slug), 'streaming slug');
  if (streamingView) return { ok: false, error: 'streaming already open' };
  currentStreamingSlug = slug;
  overlayMenuVisible = false;

  // Prevent display sleep while streaming is active
  if (powerSaveBlockerId === null) {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  }

  const { width, height } = getViewBounds();

  if (url && !url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  const initialHostname = hostnameFromUrl(url);
  if (matchesHostname(initialHostname, 'youtube.com') || matchesHostname(initialHostname, 'youtu.be')) {
    url = 'https://www.youtube.com/tv';
  }

  const isPrimeVideo = matchesHostname(hostnameFromUrl(url), 'primevideo.com');

  // Create streaming view — loads in background behind loading
  const streamView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-streaming.js'),
      contextIsolation: false,
      nodeIntegration: false,
      additionalArguments: [slug],
    }
  });
  streamingView = streamView;
  const streamGeneration = ++streamingGeneration;
  streamView.setBackgroundColor('#0a0816');
  streamView.setBounds({ x: 0, y: 0, width, height });
  streamView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  attachRendererLogging(streamView.webContents, `streaming:${slug}`);

  // TV Identity — User-Agent + Client Hints headers (skip for Prime Video and Netflix)
  const skipTvIdentity = isPrimeVideo || slug === 'netflix';
  if (!skipTvIdentity) {
    streamView.webContents.setUserAgent(SMART_TV_UA);
    removeStreamingClientHints = clientHintsRegistry.register(
      streamView.webContents.session,
      streamView.webContents.id,
      SMART_TV_CLIENT_HINTS
    );
  }

  let loadFailureHandled = false;
  const recoverStreaming = (reason) => {
    if (loadFailureHandled || !isCurrentStreamingView(streamView, streamGeneration)) return;
    loadFailureHandled = true;
    console.error(`[streaming] returning home after ${reason}`);
    returnHome();
  };
  streamView.webContents.on('did-fail-load', (_, code, desc, failedUrl, isMainFrame) => {
    console.error(`[streaming] failed to load: ${code} ${desc}`);
    if (code !== -3 && isMainFrame) recoverStreaming(`main-frame load failure: ${redactUrl(failedUrl)}`);
  });
  streamView.webContents.on('render-process-gone', (_, details) => recoverStreaming(`renderer exit: ${details.reason}`));
  streamView.webContents.loadURL(url);

  streamView.webContents.on('dom-ready', () => {
    if (!isCurrentStreamingView(streamView, streamGeneration)) return;
    const currentUrl = streamView.webContents.getURL();
    const redactedUrl = redactStreamingUrl(currentUrl);
    const SN_CONFIG = getSpatialNavConfig();
    const streamConfig = SN_CONFIG[slug] || {};
    const scriptSelection = resolveCustomScript(getStreamingConfig(), currentUrl);
    const stages = [];
    const addStage = (name, filePath) => {
      try {
        stages.push({ name, code: fs.readFileSync(filePath, 'utf8') });
        return true;
      } catch (error) {
        console.error(`[streaming] injection failed provider=${slug} stage=${name} url=${redactedUrl}: ${error.message}`);
        return false;
      }
    };

    if (streamConfig.enabled !== false && !addStage('polyfill', path.join(__dirname, 'views', 'spatial-navigation', 'polyfill.js'))) return;
    if (!addStage('shared', path.join(CUSTOM_DIR, 'shared.js'))) return;
    stages.push({ name: 'slug', code: `window.__FIFOtv_slug = ${JSON.stringify(slug)};` });
    if (!addStage('spatial config', path.join(CUSTOM_DIR, 'spatial-nav.js'))) return;
    if (scriptSelection?.scriptFile && !addStage('provider script', path.join(CUSTOM_DIR, scriptSelection.scriptFile))) return;

    console.log(
      `[streaming] injection plan provider=${slug} hostname=${hostnameFromUrl(currentUrl) || '[invalid]'} script=${scriptSelection?.scriptFile || 'none'} url=${redactedUrl}`
    );
    runInjectionStages({
      webContents: streamView.webContents,
      stages,
      isCurrent: () => isCurrentStreamingView(streamView, streamGeneration),
      onStageError: (stage, error) => {
        console.error(`[streaming] injection failed provider=${slug} stage=${stage} url=${redactedUrl}: ${error.message}`);
      },
    }).then((result) => {
      if (result.ok) console.log(`[streaming] injection complete provider=${slug} url=${redactedUrl}`);
    }).catch((error) => {
      console.error(`[streaming] injection failed provider=${slug} stage=pipeline url=${redactedUrl}: ${error.message}`);
    });

    // Re-focus streaming view after page loads (Netflix may steal focus)
    setTimeout(() => {
      if (isCurrentStreamingView(streamView, streamGeneration)) {
        streamView.webContents.focus();
      }
    }, 3000);
  });

  // Create loading view — shows icon + name + spinner
  loadingView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  loadingView.setBackgroundColor('#0a0816');
  loadingView.setBounds({ x: 0, y: 0, width, height });
  const iconPath = slug ? `file://${path.join(__dirname, '..', 'frontend', 'assets', 'icons', `${slug}.svg`)}` : '';
  attachRendererLogging(loadingView.webContents, 'loading');
  loadingView.webContents.loadFile(
    path.join(__dirname, 'views', 'loading.html'),
    { query: { name: name || '', icon: iconPath } }
  );

  // Create overlay view
  overlayView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-overlay.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  overlayView.setBackgroundColor('#00000000');
  overlayView.setBounds({ x: 0, y: 0, width, height });
  protectLocalView(overlayView);
  attachRendererLogging(overlayView.webContents, 'overlay');
  overlayView.webContents.loadFile(path.join(__dirname, 'views', 'overlay.html'));

  // NOTE: before-input-event on overlay was previously blocking arrow keys
  // when menu was open (prevented default + sendInputEvent), which broke
  // D-pad navigation in the overlay's context menu. Removed — the overlay's
  // handleKey function already handles arrows when menu is open.

  // Z-order: homeView (bottom), streamingView (top, receives mouse)
  // overlay is NOT added here — it's added/removed dynamically via IPC handlers
  addView(streamView);
  addView(loadingView);

  // After 5s: remove loading, keep streaming + overlay
  const streamLoadingView = loadingView;
  loadingTimer = setTimeout(() => {
    if (isCurrentStreamingView(streamView, streamGeneration) && loadingView === streamLoadingView) {
      removeView(streamLoadingView);
      if (!streamLoadingView.webContents.isDestroyed()) streamLoadingView.webContents.destroy();
      loadingView = null;
    }
    loadingTimer = null;
  }, 5000);

  // Handle BrowserBack via app-command (Linux air mouse) — prevent listener leak
  if (!appCommandAttached) {
    win.on('app-command', handleAppCommand);
    appCommandAttached = true;
  }

  // Intercept only ContextMenu + BrowserHome — everything else passes to streaming
  streamView.webContents.on('before-input-event', handleBeforeInput);

  // Focus streaming page so it receives keyboard and mouse
  streamView.webContents.focus();

  return { ok: true };
});

function handleAppCommand(_, cmd) {
  resetHomeScreensaver();
  if (cmd === 'browser-backward') {
    if (overlayMenuVisible) {
      forwardToOverlay({ key: 'BrowserBack', type: 'keyDown' });
    } else if (streamingView && !streamingView.webContents.isDestroyed()) {
      const isSpa = currentStreamingSlug && SPA_DOMAINS.has(currentStreamingSlug);
      if (isSpa) {
        streamingView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
        streamingView.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
      } else {
        if (streamingView.webContents.navigationHistory.canGoBack()) {
          streamingView.webContents.navigationHistory.goBack();
        }
      }
    }
  } else if (cmd === 'browser-forward') {
    forwardToOverlay({ key: 'BrowserForward', type: 'keyDown' });
  }
}

function handleBeforeInput(event, input) {
  if (input.type === 'keyDown') resetHomeScreensaver();
  if (!isOverlayAlive()) return;
  if (input.type !== 'keyDown') return;

  if (input.key === 'ContextMenu') {
    event.preventDefault();
    const { width: w, height: h } = getViewBounds();
    showOverlay();
    overlayView.webContents.send('show-menu', { x: w / 2, y: h / 2 });
    return;
  }
  if (input.key === 'BrowserHome') {
    event.preventDefault();
    forwardToOverlay(input);
    return;
  }

  // Auto-focus first focusable element on first arrow key press
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(input.key) && !overlayMenuVisible) {
    streamingView.webContents.executeJavaScript(`
      if (document.activeElement === document.body || document.activeElement === document.documentElement) {
        const first = document.querySelector('button, a, [tabindex], input, [role="button"]');
        if (first) { first.focus(); }
      }
    `).catch(() => {});
  }

  // When menu is open, overlay is behind streaming — forward arrow/Enter keys via IPC
  if (overlayMenuVisible && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(input.key)) {
    event.preventDefault();
    forwardToOverlay({ key: input.key, type: 'keyDown' });
  }
}

handleFrom('nav:reload-streaming', () => [overlayView], () => {
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.reload();
  }
  return { ok: true };
});

handleFrom('nav:go-home', () => [homeView, overlayView], () => {
  returnHome();
  return { ok: true };
});

handleFrom('overlay:zoom', () => [overlayView], (_, delta) => {
  assertPayload(typeof delta === 'number' && Number.isFinite(delta), 'zoom delta');
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    const current = Math.round(streamingView.webContents.getZoomFactor() * 100);
    const zoom = clamp(current + delta, 50, 150);
    streamingView.webContents.setZoomFactor(zoom / 100);
    return { ok: true, zoom };
  }
  return { ok: false, error: 'Streaming indisponível' };
});

handleFrom('overlay:focus', () => [overlayView], (_, target) => {
  assertPayload(target === 'overlay' || target === 'streaming', 'focus target');
  if (target === 'overlay' && isOverlayAlive()) {
    overlayView.webContents.focus();
  } else if (target === 'streaming' && streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
  return { ok: true };
});

onFrom('overlay:menu-visibility', () => [overlayView], (_, visible) => {
  if (typeof visible !== 'boolean') return;
  overlayMenuVisible = visible;
});

// Z-order management: bring overlay to front when menu opens, send back when it closes
// Overlay: add to hierarchy (appears on top of streaming)
onFrom('overlay:show-menu', () => [overlayView], () => {
  if (!isOverlayAlive()) return;
  showOverlay();
  overlayView.webContents.focus();
});

// Overlay: remove from hierarchy (streaming regains full control)
onFrom('overlay:hide-menu', () => [overlayView], () => {
  if (!isOverlayAlive()) return;
  hideOverlay();
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
});

// Overlay: add to hierarchy for volume toast (purely visual, no focus change)
onFrom('overlay:toast-show', () => [overlayView], () => {
  showOverlay();
});

// Overlay: remove from hierarchy after volume toast + focus streaming
onFrom('overlay:toast-hide', () => [overlayView], () => {
  if (!isOverlayAlive()) return;
  hideOverlay();
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
});

// ─── REMOTE ACCESS (opencode serve) ────────────────────────

const SETTINGS_DEFAULT = { remoteEnabled: false };

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch (e) {
    if (log) log.warn('[Settings] Erro ao ler settings.json:', e.message);
  }
  return { ...SETTINGS_DEFAULT };
}

function saveSettings(s) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
  } catch (e) {
    if (log) log.warn('[Settings] Erro ao salvar settings.json:', e.message);
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve(false);
      else resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

function stopRemoteProcess() {
  return new Promise((resolve) => {
    if (!remoteProcess) {
      remoteRunning = false;
      resolve();
      return;
    }
    const pid = remoteProcess.pid;
    if (log) log.info(`[Remote] Parando opencode (PID ${pid})...`);
    remoteProcess.kill('SIGTERM');
    const timeout = setTimeout(() => {
      try {
        process.kill(pid, 'SIGKILL');
        if (log) log.warn(`[Remote] SIGKILL no PID ${pid}`);
      } catch (_) {}
      remoteProcess = null;
      remoteRunning = false;
      resolve();
    }, 3000);
    remoteProcess.on('exit', () => {
      clearTimeout(timeout);
      remoteProcess = null;
      remoteRunning = false;
      resolve();
    });
  });
}

function startRemoteProcess() {
  return new Promise(async (resolve) => {
    const free = await checkPort(3000);
    if (!free) {
      if (log) log.info('[Remote] Porta 3000 já está em uso; mantendo processo existente.');
      remoteRunning = true;
      startRemoteHealthCheck();
      resolve({ running: true, external: true });
      return;
    }
    if (log) log.info('[Remote] Iniciando opencode serve...');
    try {
      remoteProcess = spawn('opencode', ['serve', '--port', '3000'], {
        detached: true,
        stdio: 'ignore'
      });
      remoteProcess.unref();
      remoteProcess.on('error', (err) => {
        if (log) log.error('[Remote] Erro ao iniciar:', err.message);
        remoteRunning = false;
        remoteProcess = null;
        resolve({ running: false, error: err.message });
      });
      remoteProcess.on('exit', (code) => {
        if (log) log.info(`[Remote] opencode encerrado (código ${code})`);
        remoteRunning = false;
        remoteProcess = null;
        stopRemoteHealthCheck();
      });
      remoteRunning = true;
      startRemoteHealthCheck();
      resolve({ running: true });
    } catch (e) {
      if (log) log.error('[Remote] Falha ao iniciar:', e.message);
      resolve({ running: false, error: e.message });
    }
  });
}

function startRemoteHealthCheck() {
  stopRemoteHealthCheck();
  remoteHealthTimer = setInterval(() => {
    if (!remoteRunning) {
      stopRemoteHealthCheck();
      return;
    }
    const req = http.get('http://localhost:3000', (res) => {
      if (log) log.verbose(`[Remote] Health check OK (${res.statusCode})`);
      res.resume();
    });
    req.on('error', () => {
      if (log) log.warn('[Remote] Health check falhou');
    });
    req.setTimeout(5000, () => req.destroy());
  }, 60000);
}

function stopRemoteHealthCheck() {
  if (remoteHealthTimer) {
    clearInterval(remoteHealthTimer);
    remoteHealthTimer = null;
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

handleFrom('remote:status', () => [homeView], () => {
  return {
    running: remoteRunning,
    ip: getLocalIP(),
    port: 3000,
    hostname: os.hostname(),
  };
});

handleFrom('remote:toggle', () => [homeView], async () => {
  if (remoteRunning) {
    await stopRemoteProcess();
    const s = loadSettings();
    s.remoteEnabled = false;
    saveSettings(s);
    return { running: false };
  } else {
    const result = await startRemoteProcess();
    if (result.running) {
      const s = loadSettings();
      s.remoteEnabled = true;
      saveSettings(s);
    }
    return result;
  }
});

// ─── APP LIFECYCLE ─────────────────────────────────────────
app.whenReady().then(async () => {
  // Castlabs: wait for Widevine CDM to be ready
  if (components && components.whenReady) {
    await components.whenReady();
    console.log('[FIFOtv] Widevine CDM ready:', components.status());
  }

  // Auto-restart remote access if was enabled
  const settings = loadSettings();
  if (settings.remoteEnabled) {
    if (log) log.info('[Remote] Auto-restart ativo pelo settings.json');
    startRemoteProcess().then((r) => {
      if (!r.running && log) log.warn('[Remote] Auto-restart falhou:', r.error);
    });
  }

  const { width, height } = getViewBounds();
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    frame: false,
    backgroundColor: '#000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Dark background on BrowserWindow's own webContents (prevents white flash if views removed)
  win.webContents.loadURL('data:text/html,<html><body style="background:%23000;margin:0"></body></html>');

  // Widevine/DRM permission handlers
  session.defaultSession.setPermissionCheckHandler((wc, perm) => {
    if (perm === 'mediaKeySystem') return true;
    return false;
  });
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => {
    if (perm === 'mediaKeySystem') cb(true);
    else cb(false);
  });

  // Show splash screen first
  splashView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  splashView.setBackgroundColor('#000000');
  splashView.setBounds({ x: 0, y: 0, width, height });
  attachRendererLogging(splashView.webContents, 'splash');
  splashView.webContents.loadFile(path.join(__dirname, '..', 'frontend', 'splash.html'));
  addView(splashView);

  // After 3.5s: remove splash, create and show homeView
  setTimeout(() => {
    if (splashView) {
      removeView(splashView);
      splashView.webContents.destroy();
      splashView = null;
    }

    homeView = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    const { width: w, height: h } = getViewBounds();
    homeView.setBounds({ x: 0, y: 0, width: w, height: h });
    protectLocalView(homeView);
    attachRendererLogging(homeView.webContents, 'home');
    homeView.webContents.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'));

    homeView.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (['F1', 'F5', 'F9', 'F12'].includes(input.key)) {
        event.preventDefault();
        homeView.webContents.send('global-key', input.key);
      }
      if (input.key === 'BrowserHome') {
        event.preventDefault();
        homeView.webContents.send('global-key', 'BrowserHome');
      }
    });

    addView(homeView);
    homeView.webContents.focus();
  }, 3500);

  // Resize handler — update all views on window resize
  win.on('resize', () => {
    const { width: w, height: h } = getViewBounds();
    if (splashView && !splashView.webContents.isDestroyed()) splashView.setBounds({ x: 0, y: 0, width: w, height: h });
    if (homeView && !homeView.webContents.isDestroyed()) homeView.setBounds({ x: 0, y: 0, width: w, height: h });
    if (streamingView && !streamingView.webContents.isDestroyed()) streamingView.setBounds({ x: 0, y: 0, width: w, height: h });
    if (loadingView && !loadingView.webContents.isDestroyed()) loadingView.setBounds({ x: 0, y: 0, width: w, height: h });
    if (isOverlayAlive()) overlayView.setBounds({ x: 0, y: 0, width: w, height: h });
  });

  globalShortcut.register('VolumeUp', () => {
    resetHomeScreensaver();
    if (isOverlayAlive()) {
      overlayView.webContents.send('key-event', { key: 'VolumeUp', type: 'keyDown' });
    } else if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.send('global-key', 'VolumeUp');
    }
  });
  globalShortcut.register('VolumeDown', () => {
    resetHomeScreensaver();
    if (isOverlayAlive()) {
      overlayView.webContents.send('key-event', { key: 'VolumeDown', type: 'keyDown' });
    } else if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.send('global-key', 'VolumeDown');
    }
  });
  globalShortcut.register('MediaPlayPause', () => {
    resetHomeScreensaver();
    if (isOverlayAlive()) {
      overlayView.webContents.send('key-event', { key: 'MediaPlayPause', type: 'keyDown' });
    } else if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.send('global-key', 'MediaPlayPause');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      app.quit();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
