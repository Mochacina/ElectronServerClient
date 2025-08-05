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
  sendData: (sessionId, data, encoding) => {
    console.log(`preload: sending send-data for ${sessionId}`);
    ipcRenderer.send('send-data', { sessionId, data, encoding });
  },
  exportLog: (sessionId, logContent) => {
    console.log(`preload: sending export-log for ${sessionId}`);
    ipcRenderer.send('export-log', { sessionId, logContent });
  },
  disconnectSession: (sessionId) => {
    console.log(`preload: sending disconnect-session for ${sessionId}`);
    ipcRenderer.send('disconnect-session', sessionId);
  },

  // Main -> Renderer
  onServerStatus: (callback) => {
    console.log('preload: setting up onServerStatus listener');
    ipcRenderer.on('server-status', (_event, status) => callback(status));
  },
  onSessionUpdate: (callback) => {
    console.log('preload: setting up onSessionUpdate listener');
    ipcRenderer.on('update-session-list', (_event, sessions) => callback(sessions));
  },
  onDataLog: (callback) => {
    console.log('preload: setting up onDataLog listener');
    ipcRenderer.on('data-log', (_event, log) => callback(log));
  },
  onUpdateSessionStats: (callback) => {
    console.log('preload: setting up onUpdateSessionStats listener');
    ipcRenderer.on('update-session-stats', (_event, stats) => callback(stats));
  },
  // 리스너 제거 함수도 만들어주는게 좋아!
  removeEventListeners: () => {
    ipcRenderer.removeAllListeners('server-status');
    ipcRenderer.removeAllListeners('update-session-list');
    ipcRenderer.removeAllListeners('data-log');
    ipcRenderer.removeAllListeners('update-session-stats');
  }
});