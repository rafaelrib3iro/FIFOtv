const { app, BrowserWindow, WebContentsView, globalShortcut, ipcMain, shell, screen, session, components } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');

let win = null;
let homeView = null;
let streamingView = null;
let overlayView = null;
let loadingView = null;
let splashView = null;
let loadingTimer = null;
let appCommandAttached = false;
let overlayMenuVisible = false;
let remoteProcess = null;
let remoteRunning = false;
const DATA_PATH = path.join(__dirname, '..', 'backend', 'streamings.json');
const STREAMING_CONFIG = require('./views/streaming-customizations/config');
const CUSTOM_DIR = path.join(__dirname, 'views', 'streaming-customizations');

// ─── CHROMIUM SWITCHES (must be before app.whenReady) ────────
app.commandLine.appendSwitch('enable-spatial-navigation');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('gtk-version', '3'); // Avoid GTK 4 issues on Debian/GNOME

function readStreamings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return { streamings: [] };
  }
}

function writeStreamings(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
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

// ─── STREAMINGS ────────────────────────────────────────────
ipcMain.handle('streamings:get', () => {
  return readStreamings();
});

ipcMain.handle('streamings:add', (_, data) => {
  const db = readStreamings();
  db.streamings.push(data);
  writeStreamings(db);
  return { ok: true };
});

ipcMain.handle('streamings:remove', (_, id) => {
  const db = readStreamings();
  db.streamings = db.streamings.filter(s => s.id !== id);
  writeStreamings(db);
  return { ok: true };
});

ipcMain.handle('streamings:reorder', (_, data) => {
  writeStreamings(data);
  return { ok: true };
});

// ─── SYSTEM ────────────────────────────────────────────────
ipcMain.handle('system:shutdown', () => {
  exec('shutdown -h now');
  return { ok: true };
});

ipcMain.handle('system:reboot', () => {
  exec('shutdown -r now');
  return { ok: true };
});

ipcMain.handle('system:restart', () => {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 500);
  return { ok: true };
});

ipcMain.handle('system:update', () => {
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

ipcMain.handle('system:stats', async () => {
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
        ram_total = Math.round((parseInt(parts[1]) || 0) / 1024);
        ram_used = Math.round((parseInt(parts[2]) || 0) / 1024);
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

ipcMain.handle('system:info', () => {
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

// ─── VOLUME (wpctl) ────────────────────────────────────────
ipcMain.handle('volume:up', async () => {
  return run('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+');
});

ipcMain.handle('volume:down', async () => {
  return run('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-');
});

ipcMain.handle('volume:mute', async () => {
  return run('wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle');
});

ipcMain.handle('volume:get', async () => {
  const res = await run("wpctl get-volume @DEFAULT_AUDIO_SINK@");
  if (res.ok) {
    const match = res.output.match(/Volume:\s*([\d.]+)/);
    const vol = match ? Math.round(parseFloat(match[1]) * 100) : 50;
    const muted = res.output.includes('[MUTED]');
    return { volume: vol, muted };
  }
  return { volume: 50, muted: false };
});

// ─── WIFI (nmcli) ──────────────────────────────────────────
ipcMain.handle('wifi:status', async () => {
  const res = await run("nmcli -t -f NAME,TYPE,DEVICE connection show --active");
  if (res.ok) {
    const wifiLine = res.output.split('\n').find(l => l.includes('802-11-wireless'));
    if (wifiLine) {
      const ssid = wifiLine.split(':')[0];
      return { connected: true, ssid };
    }
  }
  return { connected: false, ssid: '' };
});

ipcMain.handle('wifi:scan', async () => {
  const res = await run("nmcli -t -f SSID,SIGNAL,SECURITY dev wifi list --rescan yes");
  if (res.ok) {
    const networks = res.output.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [ssid, signal, security] = line.split(':');
        return { ssid, signal: parseInt(signal) || 0, security: security || '' };
      })
      .filter(n => n.ssid);
    return { networks };
  }
  return { networks: [] };
});

ipcMain.handle('wifi:connect', async (_, ssid, password) => {
  const res = await run(`nmcli dev wifi connect "${ssid}" password "${password}"`);
  return { ok: res.ok, output: res.output };
});

// ─── BLUETOOTH (dbus-next) ─────────────────────────────────
const dbusNext = require('dbus-next');
const { Interface: DbusInterface, DBusError } = dbusNext.interface;
const DbusVariant = dbusNext.Variant;

let btAdapter = null;
let btAgentRegistered = false;

function btSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    btAdapter = null;
  }
  return btAdapter;
}

ipcMain.handle('bt:status', async () => {
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { connected: false, name: '', mac: '' };
    const obj = await adapter.bus.getProxyObject('org.bluez', adapter.path);
    const props = obj.getInterface('org.freedesktop.DBus.Properties');
    const powered = await props.Get('org.bluez.Adapter1', 'Powered');
    if (!powered.value) return { connected: false, name: '', mac: '' };

    const managed = await (await adapter.bus.getProxyObject('org.bluez', '/'))
      .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Device1']) {
        const d = interfaces['org.bluez.Device1'];
        const connectedProp = d['Connected'];
        if (connectedProp && connectedProp.value) {
          return {
            connected: true,
            name: d['Name'] ? d['Name'].value : '',
            mac: d['Address'] ? d['Address'].value : '',
          };
        }
      }
    }
    return { connected: false, name: '', mac: '' };
  } catch (err) {
    console.error('[BT] bt:status failed:', err.message);
    return { connected: false, name: '', mac: '' };
  }
});

ipcMain.handle('bt:scan', async () => {
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { devices: [] };
    const obj = await adapter.bus.getProxyObject('org.bluez', adapter.path);
    const adapterIface = obj.getInterface('org.bluez.Adapter1');
    const props = obj.getInterface('org.freedesktop.DBus.Properties');

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

    try { await adapterIface.StopDiscovery(); } catch {}

    return { devices };
  } catch (err) {
    console.error('[BT] bt:scan failed:', err.message);
    return { devices: [] };
  }
});

ipcMain.handle('bt:connect', async (_, mac) => {
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
    return { ok: false, error: e.text || e.message };
  }
});

ipcMain.handle('bt:disconnect', async (_, mac) => {
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
    return { ok: false };
  }
});

ipcMain.handle('bt:unpair', async (_, mac) => {
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

function destroyStreamingViews() {
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }

  if (overlayView) {
    removeView(overlayView);
    overlayView.webContents.destroy();
    overlayView = null;
  }
  if (streamingView) {
    // Cleanup Client Hints header listener
    streamingView.webContents.session.webRequest.onBeforeSendHeaders(null);
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

ipcMain.handle('nav:open-streaming', (_, url, name, slug) => {
  if (streamingView) return { ok: false, error: 'streaming already open' };

  const { width, height } = getViewBounds();

  // YouTube → TV endpoint
  if (/youtube\.com|youtu\.be/.test(url)) {
    url = 'https://www.youtube.com/tv';
  }

  // Create streaming view — loads in background behind loading
  streamingView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-streaming.js'),
      contextIsolation: false,
      nodeIntegration: false,
    }
  });
  streamingView.setBackgroundColor('#0a0816');
  streamingView.setBounds({ x: 0, y: 0, width, height });

  // TV Identity — User-Agent + Client Hints headers
  const SMART_TV_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
  streamingView.webContents.setUserAgent(SMART_TV_UA);
  streamingView.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      details.requestHeaders['Sec-CH-UA-Platform'] = '"Tizen"';
      details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
      details.requestHeaders['Sec-CH-UA'] = '"Chromium";v="149", "Not_A Brand";v="24"';
      details.requestHeaders['Sec-CH-UA-Full-Version-List'] = '"Chromium";v="149.0.0.0", "Not_A Brand";v="24.0.0.0"';
      details.requestHeaders['Sec-CH-UA-Platform-Version'] = '"6.5.0"';
      details.requestHeaders['Sec-CH-UA-Model'] = '""';
      details.requestHeaders['Sec-CH-UA-Form-Factors'] = '"TV"';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  streamingView.webContents.loadURL(url);
  streamingView.webContents.on('did-fail-load', (_, code, desc) => {
    console.error(`[streaming] failed to load: ${code} ${desc}`);
  });

  // Inject streaming customizations after dom-ready
  streamingView.webContents.on('dom-ready', () => {
    // Inject custom cursor (base64 data URIs to bypass CSP on streaming sites)
    const cursorDot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAHdElNRQfqBhUVJBkc4ui0AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA2LTIxVDIxOjM2OjI1KzAwOjAwIfwVgwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wNi0yMVQyMTozNjoyNSswMDowMFChrT8AAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDYtMjFUMjE6MzY6MjUrMDA6MDAHtIzgAAACGUlEQVRYw+2XPU/DMBCGHzekJKhUQnxJQNXObEwMTAz8agYmBqb+BaoCUkEIqVR8VcEsl+h02LRFiDDg5Rz3cu9zPn+k8N9qbm4RZ+89QApkQA40gQQogDfgGXgBps7NF3ouLxFeATYX4L0DnmaBzATw3qfAtmS6aCuAkXNu+i0A730ObJnhBGgD62KbMv1j4F5sYd65dc49LwQQEHfADtCZI/MhcAP4WRBBAJn2HTW0DBx8owR94FU939hyfAKQBbenah4SbwFdmY0WMJGsB9KPQRTAlV6YIQC92h1wqH5OBKb3RdaXIqrXwYUqx51z7ikIINl31dCuqnkCnEjGDdkZHWAVeJQZGAHvMgunCmIIXKu4g3IWGoY+NdnqBXcg4hlwDOyLOGL3ZTwTP122jtnGlY4FyFS/bWreE/8jBdgC1sSWAkfi15PxULwsBpCr/rrql2XZVuJtlUkqz4nx60biVToWoBkh7hibE255xN/Gq3QsQBJyUlNZ1jwl3FLj14rEq3QsgN46b6pf7u1HsbGzfWr8JpF4lY4F0E5j1R8aGzzX1bj1t/EqnUYkAHKxlG0gdqQyGKuMp+YSGpn3bLxKxwK8RIgncsK9A+cKYgI8iC3Fz8Xv0pRgHNJZitSwFBiqldwHNqR/NsdJ2DclLEI6f+su4C/chtT9PaAg6vsi+gKCX/smNOWo56tYQVDb/4IAyI/+M/pvH1xY0SKRcHRhAAAAAElFTkSuQmCC';
    const cursorHover = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAHdElNRQfqBhUVJCBD52C8AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTA2LTIxVDIxOjM2OjMyKzAwOjAwKPErkwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0wNi0yMVQyMTozNjozMiswMDowMFmsky8AAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMDYtMjFUMjE6MzY6MzIrMDA6MDAOubLwAAACf0lEQVRYw+WXwU9TQRDGf/ugtZQgbaGCJcHECImJ8e4Br/7NXuXg3ZiYIDGRBLS2haLpA1voeuhs/BhbYpGkJO5lZ97O7nzz7ezsPvjfW5jGOMYYgCKwCJSBEpABQ+AcyIEe0A8hxFsDEGPMgAqwOgXeNtANIQz/CUCMcQl4eHOS+RJC+DE1AKN7DbjvhopAzdhYNr0PnFrUx6Zr+w40x21LuMb5hu1zaiXgCVD/i6hbwL7lRWo5cOhBTAKw7iJfB57egP4PwFdlIoSg+p8Axuz5I+Cxm1MFNoGGsZQDR8ABcAJolJ+Az6JfyYngnGdG86TIl4AdtzW+5cAuoInnmdhPp8MDqMlRKwEvZPgB8NLkguXCGrAAnAFN2/uB2bwBvsn8t5IT7RDC8RUAlnhbMuGZJNwS8MrkVWD7Ggb27DQAvBYmWsB7sfsYQoiZfCg6OTkPRrt3PmcspYo4Z9+3hcUdCbI+xgcKYFHkmshVc1IQ50XgnszPTC8KiILNq05Yd9ED0MTSkrspEaTI5yNwmMO77qi3tJ8XJupuvl+37AGURF4WuWH9mvUFgKMcOlbvOv2RruNi35C1Kt6fApiUD4mZBbXruGIreubsldmCyJl3qreWLp9iO1O7FYV4VR86+1zMBiIPPQCt26ciH1nf1EUa5d9OV4oj3TlpuvkAXe9PASjStsgH1resvwQuArBRhueVUW9n7cLG1f5gwrq5B9AT+VjkEzMeWJFJW/RT6B6anrZuz+xzmz9u3Z4H0HdyiiBabU8RJBCX8gw7l8i1Eu7KxdQa4+MO3QXchduQWb8HBMTsXkTchTchs34VOyCz+S9wIGb3Z+SA3Pq/4czbL8CzCDfzoDluAAAAAElFTkSuQmCC';
    streamingView.webContents.insertCSS(`
      *, *::before, *::after {
        cursor: url('${cursorDot}') 16 16, none !important;
      }
      .ytp-progress-bar, .ytp-chrome-bottom, .ytp-chrome-top,
      button, a, [role="button"], [tabindex="0"], input, select, textarea {
        cursor: url('${cursorHover}') 16 16, none !important;
      }
    `).catch(() => {});

    // Inject cursor idle tracking
    streamingView.webContents.executeJavaScript(`
      (function() {
        let idleTimer = null;
        function resetIdle() {
          document.documentElement.classList.remove('fifotv-cursor-idle');
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            document.documentElement.classList.add('fifotv-cursor-idle');
          }, 3000);
        }
        document.addEventListener('mousemove', resetIdle, { passive: true });
        resetIdle();
      })();
    `).catch(() => {});
    streamingView.webContents.insertCSS(`
      .fifotv-cursor-idle, .fifotv-cursor-idle *, .fifotv-cursor-idle *::before, .fifotv-cursor-idle *::after {
        cursor: none !important;
      }
    `).catch(() => {});
    // Inject spatial-navigation blocker: when overlay menu is open, block arrow keys
    // from reaching spatial navigation (they go to overlay's D-pad handler instead)
    streamingView.webContents.executeJavaScript(`
      window.__fifotv_no_spatial = false;
      document.addEventListener('keydown', (e) => {
        if (window.__fifotv_no_spatial && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      }, true);
    `).catch(() => {});

    const currentUrl = streamingView.webContents.getURL();
    let scriptFile = null;
    for (const [domain, file] of Object.entries(STREAMING_CONFIG)) {
      if (currentUrl.includes(domain)) {
        scriptFile = file;
        break;
      }
    }
    if (!scriptFile) return;

    try {
      const sharedCode = fs.readFileSync(path.join(CUSTOM_DIR, 'shared.js'), 'utf8');
      streamingView.webContents.executeJavaScript(sharedCode);

      const scriptCode = fs.readFileSync(path.join(CUSTOM_DIR, scriptFile), 'utf8');
      streamingView.webContents.executeJavaScript(scriptCode);
      console.log(`[streaming] injected: ${scriptFile}`);
    } catch (err) {
      console.error(`[streaming] injection failed: ${err.message}`);
    }
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
  overlayView.webContents.loadFile(path.join(__dirname, 'views', 'overlay.html'));

  // Z-order: homeView (bottom), streamingView (top, receives mouse)
  // overlay is NOT added here — it's added/removed dynamically via IPC handlers
  addView(streamingView);
  addView(loadingView);

  // After 5s: remove loading, keep streaming + overlay
  loadingTimer = setTimeout(() => {
    removeView(loadingView);
    if (loadingView) { loadingView.webContents.destroy(); loadingView = null; }
  }, 5000);

  // Handle BrowserBack via app-command (Linux air mouse) — prevent listener leak
  if (!appCommandAttached) {
    win.on('app-command', handleAppCommand);
    appCommandAttached = true;
  }

  // Intercept only ContextMenu + BrowserHome — everything else passes to streaming
  streamingView.webContents.on('before-input-event', handleBeforeInput);

  // Focus streaming page so it receives keyboard and mouse
  streamingView.webContents.focus();

  return { ok: true };
});

function handleAppCommand(_, cmd) {
  if (cmd === 'browser-backward') {
    if (overlayMenuVisible) {
      forwardToOverlay({ key: 'BrowserBack', type: 'keyDown' });
    } else if (streamingView && !streamingView.webContents.isDestroyed()) {
      if (streamingView.webContents.navigationHistory.canGoBack()) {
        streamingView.webContents.navigationHistory.goBack();
      }
    }
  } else if (cmd === 'browser-forward') {
    forwardToOverlay({ key: 'BrowserForward', type: 'keyDown' });
  }
}

function handleBeforeInput(event, input) {
  if (!isOverlayAlive()) return;
  if (input.type !== 'keyDown') return;

  if (input.key === 'ContextMenu') {
    event.preventDefault();
    const { width: w, height: h } = getViewBounds();
    overlayView.webContents.send('show-menu', { x: w / 2, y: h / 2 });
    return;
  }
  if (input.key === 'BrowserHome') {
    event.preventDefault();
    forwardToOverlay(input);
    return;
  }

  // When menu is open, overlay is behind streaming — forward arrow/Enter keys via IPC
  if (overlayMenuVisible && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(input.key)) {
    event.preventDefault();
    forwardToOverlay({ key: input.key, type: 'keyDown' });
  }
}

ipcMain.handle('nav:reload-streaming', () => {
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.reload();
  }
  return { ok: true };
});

ipcMain.handle('nav:go-home', () => {
  // Remove app-command listener from win
  if (appCommandAttached) {
    win.removeListener('app-command', handleAppCommand);
    appCommandAttached = false;
  }

  // Defer destruction — can't destroy the caller's webContents inside its own IPC handler
  setImmediate(() => {
    destroyStreamingViews();
    if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.focus();
    }
  });

  return { ok: true };
});

ipcMain.handle('overlay:zoom', (_, delta) => {
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    const zoom = streamingView.webContents.getZoomLevel();
    streamingView.webContents.setZoomLevel(zoom + (delta > 0 ? 0.5 : -0.5));
  }
  return { ok: true };
});

ipcMain.handle('overlay:set-mouse-events', (_, ignore) => {
  if (isOverlayAlive()) {
    overlayView.webContents.setIgnoreMouseEvents(ignore);
  }
  return { ok: true };
});

ipcMain.handle('overlay:focus', (_, target) => {
  if (target === 'overlay' && isOverlayAlive()) {
    overlayView.webContents.focus();
  } else if (target === 'streaming' && streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
  return { ok: true };
});

ipcMain.on('overlay:menu-visibility', (_, visible) => {
  overlayMenuVisible = visible;
  // Toggle spatial-navigation blocking on streaming page
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.executeJavaScript(
      `window.__fifotv_no_spatial = ${visible};`
    ).catch(() => {});
  }
});

// Z-order management: bring overlay to front when menu opens, send back when it closes
// Overlay: add to hierarchy (appears on top of streaming)
ipcMain.on('overlay:show-menu', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  win.contentView.addChildView(overlayView);
  overlayView.webContents.focus();
});

// Overlay: remove from hierarchy (streaming regains full control)
ipcMain.on('overlay:hide-menu', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  try { win.contentView.removeChildView(overlayView); } catch {}
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
});

// Overlay: add to hierarchy for volume toast (purely visual, no focus change)
ipcMain.on('overlay:toast-show', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  win.contentView.addChildView(overlayView);
});

// Overlay: remove from hierarchy after volume toast + focus streaming
ipcMain.on('overlay:toast-hide', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  try { win.contentView.removeChildView(overlayView); } catch {}
  if (streamingView && !streamingView.webContents.isDestroyed()) {
    streamingView.webContents.focus();
  }
});

// ─── REMOTE ACCESS (opencode serve) ────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

ipcMain.handle('remote:status', () => {
  return {
    running: remoteRunning,
    ip: getLocalIP(),
    port: 3000,
    hostname: os.hostname(),
  };
});

ipcMain.handle('remote:toggle', () => {
  if (remoteRunning) {
    // Stop opencode serve
    if (remoteProcess) {
      remoteProcess.kill('SIGTERM');
      remoteProcess = null;
    }
    remoteRunning = false;
    return { running: false };
  } else {
    // Start opencode serve
    try {
      remoteProcess = exec('opencode serve --port 3000', { timeout: 30000 });
      remoteProcess.on('error', (err) => {
        console.error('[Remote] Erro:', err.message);
        remoteRunning = false;
        remoteProcess = null;
      });
      remoteProcess.on('exit', () => {
        remoteRunning = false;
        remoteProcess = null;
      });
      remoteRunning = true;
      return { running: true };
    } catch (e) {
      console.error('[Remote] Falha ao iniciar:', e.message);
      return { running: false, error: e.message };
    }
  }
});

// ─── APP LIFECYCLE ─────────────────────────────────────────
app.whenReady().then(async () => {
  // Castlabs: wait for Widevine CDM to be ready
  if (components && components.whenReady) {
    await components.whenReady();
    console.log('[FIFOtv] Widevine CDM ready:', components.status());
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
    homeView.webContents.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'));

    // Cursor idle timer for homeView
    homeView.webContents.on('dom-ready', () => {
      homeView.webContents.executeJavaScript(`
        (function() {
          let idleTimer = null;
          function resetIdle() {
            document.documentElement.classList.remove('fifotv-cursor-idle');
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              document.documentElement.classList.add('fifotv-cursor-idle');
            }, 3000);
          }
          document.addEventListener('mousemove', resetIdle, { passive: true });
          resetIdle();
        })();
      `).catch(() => {});
      homeView.webContents.insertCSS(`
        .fifotv-cursor-idle, .fifotv-cursor-idle *, .fifotv-cursor-idle *::before, .fifotv-cursor-idle *::after {
          cursor: none !important;
        }
      `).catch(() => {});
    });

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
    if (isOverlayAlive()) {
      overlayView.webContents.send('key-event', { key: 'VolumeUp', type: 'keyDown' });
    } else if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.send('global-key', 'VolumeUp');
    }
  });
  globalShortcut.register('VolumeDown', () => {
    if (isOverlayAlive()) {
      overlayView.webContents.send('key-event', { key: 'VolumeDown', type: 'keyDown' });
    } else if (homeView && !homeView.webContents.isDestroyed()) {
      homeView.webContents.send('global-key', 'VolumeDown');
    }
  });
  globalShortcut.register('MediaPlayPause', () => {
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
