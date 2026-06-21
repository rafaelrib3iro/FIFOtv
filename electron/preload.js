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
  openStreaming: (url, name, slug) => ipcRenderer.invoke('nav:open-streaming', url, name, slug),
  goHome: () => ipcRenderer.invoke('nav:go-home'),

  // Acesso Remoto
  remoteStatus: () => ipcRenderer.invoke('remote:status'),
  remoteToggle: () => ipcRenderer.invoke('remote:toggle'),

  // Eventos do main process
  onVolumeChange: (cb) => ipcRenderer.on('volume:changed', (_, data) => cb(data)),
  onBtStatusChange: (cb) => ipcRenderer.on('bt:status-changed', (_, data) => cb(data)),
  onGlobalKey: (cb) => ipcRenderer.on('global-key', (_, key) => cb(key)),
});
