const { app, BrowserWindow, ipcMain } = require('electron');
const net = require('net');
const path = require('path');

// 디버깅: main.js 로드 확인
console.log('main.js loaded');

function createWindow() {
  // 디버깅: createWindow 함수 호출 확인
  console.log('Creating main window...');

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 디버깅: HTML 파일 로드 시도
  console.log(`Loading URL: file://${path.join(__dirname, '../renderer/index.html')}`);
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 개발자 도구를 열어! 디버깅에 필수지!
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    // 디버깅: 윈도우 종료 이벤트 확인
    console.log('Main window closed');
  });
}

app.whenReady().then(() => {
  // 디버깅: app ready 이벤트 확인
  console.log('App is ready, creating window.');
  createWindow();

  app.on('activate', () => {
    // macOS에서 독 아이콘을 클릭했을 때 창이 없으면 새로 생성하는 로직
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('App activated, creating window.');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 모든 윈도우가 닫혔을 때 앱을 종료 (macOS 제외)
  if (process.platform !== 'darwin') {
    console.log('All windows closed, quitting app.');
    app.quit();
  }
});

// --- IPC Handlers ---
let server;
let sockets = [];

ipcMain.on('start-server', (event, options) => {
  console.log('main: received start-server', options);
  if (server && server.listening) {
    console.log('main: Server is already running.');
    return;
  }

  server = net.createServer((socket) => {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    sockets.push(socket);
    console.log(`main: Client connected: ${socketId}`);
    
    // 클라이언트 연결 상태를 렌더러로 전송
    event.sender.send('server-status', { message: `Client connected: ${socketId}` });

    socket.on('data', (data) => {
      console.log(`main: Received data from ${socketId}: ${data.toString()}`);
      // 데이터 수신 상태를 렌더러로 전송
      event.sender.send('server-status', { message: `Data from ${socketId}: ${data.length} bytes` });
    });

    socket.on('close', () => {
      sockets = sockets.filter(s => s !== socket);
      console.log(`main: Client disconnected: ${socketId}`);
      event.sender.send('server-status', { message: `Client disconnected: ${socketId}` });
    });

    socket.on('error', (err) => {
      console.error(`main: Socket error from ${socketId}:`, err);
      event.sender.send('server-status', { message: `Socket Error: ${err.message}` });
    });
  });

  server.on('error', (err) => {
    console.error('main: Server error:', err);
    event.sender.send('server-status', { message: `Server Error: ${err.message}` });
  });

  server.listen(options.port, '0.0.0.0', () => {
    console.log(`main: TCP Server listening on port ${options.port}`);
    event.sender.send('server-status', { message: `Server listening on port ${options.port}`, listening: true });
  });
});

ipcMain.on('stop-server', (event) => {
  console.log('main: received stop-server');
  sockets.forEach(socket => socket.destroy());
  sockets = [];
  if (server) {
    server.close(() => {
      console.log('main: Server stopped.');
      event.sender.send('server-status', { message: 'Server stopped', listening: false });
      server = null;
    });
  }
});