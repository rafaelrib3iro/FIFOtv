const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fifotv', {
  // Volume
  volumeUp: () => ipcRenderer.invoke('volume:up'),
  volumeDown: () => ipcRenderer.invoke('volume:down'),
  volumeMute: () => ipcRenderer.invoke('volume:mute'),
  getVolume: () => ipcRenderer.invoke('volume:get'),

  // Sistema
  getStats: () => ipcRenderer.invoke('system:stats'),
  getInfo: () => ipcRenderer.invoke('system:info'),

  // Navegação
  goHome: () => ipcRenderer.invoke('nav:go-home'),
  reloadStreaming: () => ipcRenderer.invoke('nav:reload-streaming'),

  // Sistema
  shutdown: () => ipcRenderer.invoke('system:shutdown'),
  restartApp: () => ipcRenderer.invoke('system:restart'),

  // Zoom
  zoom: (delta) => ipcRenderer.invoke('overlay:zoom', delta),

  // Focus + mouse passthrough
  setMouseEvents: (ignore) => ipcRenderer.invoke('overlay:set-mouse-events', ignore),
  setFocus: (target) => ipcRenderer.invoke('overlay:focus', target),
  setMenuVisibility: (visible) => ipcRenderer.send('overlay:menu-visibility', visible),

  // Z-order management
  bringOverlayToFront: () => ipcRenderer.send('overlay:show-menu'),
  sendOverlayToBack: () => ipcRenderer.send('overlay:hide-menu'),

  // Z-order for volume toast (no focus change)
  showToastOverlay: () => ipcRenderer.send('overlay:toast-show'),
  hideToastOverlay: () => ipcRenderer.send('overlay:toast-hide'),

  // Eventos do main process
  onKey: (cb) => ipcRenderer.on('key-event', (_, input) => cb(input)),
  onShowMenu: (cb) => ipcRenderer.on('show-menu', (_, data) => cb(data)),
  onHideMenu: (cb) => ipcRenderer.on('hide-menu', () => cb()),
});
