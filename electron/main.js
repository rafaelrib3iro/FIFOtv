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
  if (fs.existsSync(scriptPath)) {
    exec(`bash "${scriptPath}"`, { timeout: 60000 });
  }
  return { ok: true, output: 'Atualização iniciada' };
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
let btAdapter = null;

async function getBtAdapter() {
  if (btAdapter) return btAdapter;
  try {
    const dbus = require('dbus-next');
    const systemBus = dbus.systemBus();
    const obj = await systemBus.getProxyObject('org.bluez', '/');
    const mgr = obj.getInterface('org.freedesktop.DBus.ObjectManager');
    const managed = await mgr.GetManagedObjects();
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Adapter1']) {
        btAdapter = { path, bus: systemBus };
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
    const dev = obj.getInterface('org.bluez.Adapter1');

    try { await dev.StopDiscovery(); } catch {}

    await dev.StartDiscovery();
    await new Promise(r => setTimeout(r, 3000));

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

    try { await dev.StopDiscovery(); } catch {}

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
    const managed = await (await adapter.bus.getProxyObject('org.bluez', '/'))
      .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Device1']) {
        const d = interfaces['org.bluez.Device1'];
        if (d['Address'] && d['Address'].value === mac) {
          const obj = await adapter.bus.getProxyObject('org.bluez', path);
          const dev = obj.getInterface('org.bluez.Device1');
          await dev.Connect();
          return { ok: true };
        }
      }
    }
    return { ok: false, error: 'Device not found' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('bt:disconnect', async (_, mac) => {
  try {
    const adapter = await getBtAdapter();
    if (!adapter) return { ok: false };
    const managed = await (await adapter.bus.getProxyObject('org.bluez', '/'))
      .getInterface('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
    for (const [path, interfaces] of Object.entries(managed)) {
      if (interfaces['org.bluez.Device1']) {
        const d = interfaces['org.bluez.Device1'];
        if (d['Address'] && d['Address'].value === mac) {
          const obj = await adapter.bus.getProxyObject('org.bluez', path);
          const dev = obj.getInterface('org.bluez.Device1');
          await dev.Disconnect();
          return { ok: true };
        }
      }
    }
    return { ok: false };
  } catch (err) {
    console.error('[BT] bt:disconnect failed:', err.message);
    return { ok: false };
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

  // Z-order: homeView (bottom), overlayView (behind streaming), streamingView (top, receives mouse)
  addView(overlayView);
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
ipcMain.on('overlay:show-menu', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  win.contentView.removeChildView(overlayView);
  win.contentView.addChildView(overlayView); // overlay goes to top
  overlayView.webContents.focus(); // focus AFTER z-order so it actually receives keys
});

ipcMain.on('overlay:hide-menu', () => {
  if (!streamingView || streamingView.webContents.isDestroyed() || !win) return;
  win.contentView.removeChildView(streamingView);
  win.contentView.addChildView(streamingView); // streaming goes back to top
  streamingView.webContents.focus(); // focus AFTER z-order
});

// Z-order for volume toast: no focus change, just z-order
ipcMain.on('overlay:toast-show', () => {
  if (!overlayView || overlayView.webContents.isDestroyed() || !win) return;
  win.contentView.removeChildView(overlayView);
  win.contentView.addChildView(overlayView); // overlay goes to top
});

ipcMain.on('overlay:toast-hide', () => {
  if (!streamingView || streamingView.webContents.isDestroyed() || !win) return;
  win.contentView.removeChildView(streamingView);
  win.contentView.addChildView(streamingView); // streaming goes back to top
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
