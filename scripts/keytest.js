const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const w = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: false }
  });
  w.loadFile(path.join(__dirname, '..', 'frontend', 'keytest.html'));

  // Capture before-input-event (what Chromium sees before renderer)
  w.webContents.on('before-input-event', (event, input) => {
    console.log(`[before-input] key=${input.key} code=${input.code} keyCode=${input.keyCode} type=${input.type}`);
  });

  // Capture app-command (OS-level events from air mouse)
  w.on('app-command', (_, cmd) => {
    console.log(`[app-command] cmd=${cmd}`);
  });

  // Register media keys
  globalShortcut.register('VolumeUp', () => console.log('[globalShortcut] VolumeUp'));
  globalShortcut.register('VolumeDown', () => console.log('[globalShortcut] VolumeDown'));
  globalShortcut.register('MediaPlayPause', () => console.log('[globalShortcut] MediaPlayPause'));
});

app.on('window-all-closed', () => app.quit());
