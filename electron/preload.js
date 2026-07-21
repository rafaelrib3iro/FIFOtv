const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fifotv', {
  // Apps
  getApps: () => ipcRenderer.invoke('apps:get'),
  addApp: (data) => ipcRenderer.invoke('apps:add', data),
  removeApp: (id) => ipcRenderer.invoke('apps:remove', id),
  reorderApps: (list) => ipcRenderer.invoke('apps:reorder', list),

  // Sistema
  shutdown: () => ipcRenderer.invoke('system:shutdown'),
  reboot: () => ipcRenderer.invoke('system:reboot'),
  restartApp: () => ipcRenderer.invoke('system:restart'),
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
  btUnpair: (mac) => ipcRenderer.invoke('bt:unpair', mac),

  // Navegação
  openApp: (app) => ipcRenderer.invoke('nav:open-app', app),
  goHome: () => ipcRenderer.invoke('nav:go-home'),

  // Display
  screenOff: () => ipcRenderer.invoke('system:screen-off'),

  // Eventos do main process
  onGlobalKey: (cb) => ipcRenderer.on('global-key', (_, key) => cb(key)),
  onScreensaverReset: (cb) => ipcRenderer.on('screensaver:reset', () => cb()),
});
