const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Renderer -> Main
  connect: (options) => ipcRenderer.send('connect', options),
  disconnect: () => ipcRenderer.send('disconnect'),
  sendData: (data, encoding) => ipcRenderer.send('send-data', { data, encoding }),

  // Main -> Renderer
  onStatusChange: (callback) => ipcRenderer.on('status-change', (_event, status) => callback(status)),
  onData: (callback) => ipcRenderer.on('data', (_event, log) => callback(log)),
  onStatsUpdate: (callback) => ipcRenderer.on('stats-update', (_event, stats) => callback(stats)),

  // Cleanup
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('status-change');
    ipcRenderer.removeAllListeners('data');
    ipcRenderer.removeAllListeners('stats-update');
  }
});