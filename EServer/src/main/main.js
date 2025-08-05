const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const net = require('net');
const dgram = require('dgram');
const fs = require('fs');

// 디버깅: main.js 로드 확인
console.log('main.js loaded');

let mainWindow;

function createWindow() {
  // 디버깅: createWindow 함수 호출 확인
  console.log('Creating main window...');

  mainWindow = new BrowserWindow({
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

  mainWindow.webContents.openDevTools(); // Hmph! No more debug tools for you!

  mainWindow.on('closed', () => {
    // 디버깅: 윈도우 종료 이벤트 확인
    console.log('Main window closed');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 디버깅: app ready 이벤트 확인
  console.log('App is ready, creating window.');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('App activated, creating window.');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('All windows closed, quitting app.');
    app.quit();
  }
});

// --- IPC Handlers & Server Logic ---
let server;
let serverType = null; // 'tcp' or 'udp'
const sessions = new Map();

function updateSessionList() {
  if (mainWindow) {
    const sessionList = Array.from(sessions.values()).map(s => ({
      id: s.id,
      status: s.status,
      connectedTime: s.connectedTime,
      rx: s.rx,
      tx: s.tx,
    }));
    console.log('main: sending update-session-list', sessionList);
    mainWindow.webContents.send('update-session-list', sessionList);
  }
}

function sendLog(log) {
    if (mainWindow) {
        console.log('main: sending data-log', log);
        mainWindow.webContents.send('data-log', log);
    }
}

ipcMain.on('start-server', (event, options) => {
  console.log('main: received start-server', options);
  if (server) {
    console.log('main: Server is already running.');
    return;
  }

  serverType = options.protocol.toLowerCase();

  if (serverType === 'tcp') {
    server = net.createServer((socket) => {
      const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
      const session = {
        socket,
        id: socketId,
        connectedTime: new Date().toISOString(),
        status: 'connected',
        rx: 0,
        tx: 0,
      };
      sessions.set(socketId, session);
      console.log(`main: Client connected: ${socketId}`);
      
      event.sender.send('server-status', { message: `Client connected: ${socketId}` });
      updateSessionList();

      socket.on('data', (data) => {
        session.rx += data.length;
        console.log(`main: Received ${data.length} bytes from ${socketId}`);
        sendLog({ sessionId: socketId, direction: 'incoming', data: data.toString('hex'), timestamp: new Date().toISOString() });
        updateSessionList();
      });

      socket.on('close', () => {
        session.status = 'disconnected';
        console.log(`main: Client disconnected: ${socketId}`);
        setTimeout(() => sessions.delete(socketId), 5000);
        updateSessionList();
      });

      socket.on('error', (err) => {
        session.status = 'error';
        console.error(`main: Socket error from ${socketId}:`, err);
        updateSessionList();
      });
    });
  } else if (serverType === 'udp') {
    server = dgram.createSocket('udp4');

    server.on('message', (msg, rinfo) => {
      const socketId = `${rinfo.address}:${rinfo.port}`;
      let session = sessions.get(socketId);
      if (!session) {
        session = {
          id: socketId,
          rinfo: rinfo, // UDP는 rinfo로 응답해야 해
          connectedTime: new Date().toISOString(),
          status: 'active',
          rx: 0,
          tx: 0,
        };
        sessions.set(socketId, session);
        console.log(`main: New UDP peer: ${socketId}`);
      }
      session.rx += msg.length;
      session.lastActivity = new Date().toISOString();
      
      console.log(`main: Received ${msg.length} UDP bytes from ${socketId}`);
      sendLog({ sessionId: socketId, direction: 'incoming', data: msg.toString('hex'), timestamp: new Date().toISOString() });
      updateSessionList();
    });
  }

  server.on('error', (err) => {
    console.error('main: Server error:', err);
    event.sender.send('server-status', { message: `Server Error: ${err.message}`, listening: false });
    server.close();
    server = null;
  });

  if (serverType === 'tcp') {
    server.listen(options.port, '0.0.0.0', () => {
      console.log(`main: TCP Server listening on port ${options.port}`);
      event.sender.send('server-status', { message: `TCP Server listening on port ${options.port}`, listening: true });
    });
  } else if (serverType === 'udp') {
    server.bind(options.port, () => {
      console.log(`main: UDP Server listening on port ${options.port}`);
      event.sender.send('server-status', { message: `UDP Server listening on port ${options.port}`, listening: true });
    });
  }
});

ipcMain.on('stop-server', (event) => {
  console.log('main: received stop-server');
  if (serverType === 'tcp') {
    sessions.forEach(session => session.socket.destroy());
  }
  sessions.clear();
  
  if (server) {
    server.close(() => {
      console.log(`main: ${serverType.toUpperCase()} Server stopped.`);
      event.sender.send('server-status', { message: 'Server stopped', listening: false });
      updateSessionList();
      server = null;
      serverType = null;
    });
  }
});

ipcMain.on('send-data', (event, { sessionId, data, encoding }) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    try {
        const buffer = Buffer.from(data, encoding);
        if (serverType === 'tcp' && session.socket) {
            session.socket.write(buffer);
        } else if (serverType === 'udp' && server) {
            server.send(buffer, session.rinfo.port, session.rinfo.address, (err) => {
                if (err) throw err;
            });
        }
        session.tx += buffer.length;
        console.log(`main: Sent ${buffer.length} bytes to ${sessionId}`);
        sendLog({ sessionId: sessionId, direction: 'outgoing', data: buffer.toString('hex'), timestamp: new Date().toISOString() });
        updateSessionList();
    } catch (error) {
        console.error('main: Error sending data:', error);
        sendLog({ sessionId: sessionId, direction: 'error', data: `Error sending data: ${error.message}`, timestamp: new Date().toISOString() });
    }
});

ipcMain.on('export-log', async (event, { sessionId, logContent }) => {
  console.log(`main: received export-log for ${sessionId}`);
  const defaultPath = `log_${sessionId.replace(/:/g, '_')}_${new Date().toISOString().replace(/:/g, '-')}.txt`;
  
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Session Log',
    defaultPath: defaultPath,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, logContent, 'utf-8');
      console.log(`main: Log for ${sessionId} exported to ${filePath}`);
      // 사용자에게 성공 메시지를 보내줄 수도 있어!
      event.sender.send('server-status', { message: `Log exported to ${filePath}` });
    } catch (error) {
      console.error('main: Failed to export log:', error);
      event.sender.send('server-status', { message: `Error exporting log: ${error.message}` });
    }
  }
});