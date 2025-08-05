const { contextBridge, ipcRenderer } = require('electron');

// 디버깅: preload.js 로드 확인
console.log('preload.js loaded');

contextBridge.exposeInMainWorld('api', {
  // Renderer -> Main
  startServer: (options) => {
    console.log('preload: sending start-server', options);
    ipcRenderer.send('start-server', options);
  },
  stopServer: () => {
    console.log('preload: sending stop-server');
    ipcRenderer.send('stop-server');
  },

  // Main -> Renderer
  onServerStatus: (callback) => {
    console.log('preload: setting up onServerStatus listener');
    ipcRenderer.on('server-status', (_event, status) => callback(status));
  },
  // 리스너 제거 함수도 만들어주는게 좋아!
  removeServerStatusListeners: () => ipcRenderer.removeAllListeners('server-status'),
});