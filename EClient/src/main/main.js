const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const dgram = require('dgram');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // For debugging, you can open DevTools
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers & Client Logic ---
let client;
let clientType = null;
let rx = 0;
let tx = 0;

function sendStatus(message, connected) {
  if (mainWindow) {
    mainWindow.webContents.send('status-change', { message, connected });
  }
}

function sendLog(direction, data) {
  if (mainWindow) {
    mainWindow.webContents.send('data', { direction, data });
  }
}

function sendStats() {
  if (mainWindow) {
    mainWindow.webContents.send('stats-update', { rx, tx });
  }
}

ipcMain.on('connect', (event, options) => {
  if (client) {
    sendStatus('Already connected or connecting.', true);
    return;
  }

  rx = 0;
  tx = 0;
  clientType = options.protocol.toLowerCase();
  sendStatus(`Connecting to ${options.host}:${options.port}...`, false);

  if (clientType === 'tcp') {
    client = net.createConnection({ host: options.host, port: options.port }, () => {
      console.log('Connected to server!');
      sendStatus('Connected (TCP)', true);
      sendStats();
    });

    client.on('data', (data) => {
      rx += data.length;
      console.log(`Received ${data.length} bytes`);
      sendLog('incoming', data.toString('utf8'));
      sendStats();
    });

    client.on('close', () => {
      console.log('Connection closed');
      sendStatus('Disconnected', false);
      client = null;
    });

    client.on('error', (err) => {
      console.error('Connection error:', err);
      sendStatus(`Error: ${err.message}`, false);
      client = null;
    });

  } else if (clientType === 'udp') {
    client = dgram.createSocket('udp4');
    // For UDP, "connect" doesn't establish a persistent connection,
    // but it allows us to use `write` instead of `send` and filters incoming messages.
    client.connect(options.port, options.host, () => {
        console.log('UDP socket active');
        sendStatus('Active (UDP)', true);
        sendStats();
    });

    client.on('message', (msg, rinfo) => {
        rx += msg.length;
        console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
        sendLog('incoming', msg.toString('utf8'));
        sendStats();
    });

    client.on('close', () => {
        console.log('UDP socket closed');
        sendStatus('Disconnected', false);
        client = null;
    });

    client.on('error', (err) => {
        console.error('UDP error:', err);
        sendStatus(`Error: ${err.message}`, false);
        client = null;
    });
  }
});

ipcMain.on('disconnect', () => {
  if (client) {
    if (clientType === 'tcp') {
        client.destroy();
    } else if (clientType === 'udp') {
        client.close();
    }
    client = null;
  }
});

ipcMain.on('send-data', (event, { data, encoding }) => {
  if (!client) return;

  try {
    const buffer = Buffer.from(data, encoding);
    
    const writeCallback = (err) => {
        if (err) {
            console.error('Write/Send error:', err);
            sendStatus(`Error: ${err.message}`, false);
        } else {
            tx += buffer.length;
            console.log(`Sent ${buffer.length} bytes`);
            sendLog('outgoing', data); // Send original data for logging
            sendStats();
        }
    };

    if (clientType === 'tcp') {
        client.write(buffer, writeCallback);
    } else if (clientType === 'udp') {
        // Since we used connect(), we can use write() for UDP as well
        client.send(buffer, writeCallback);
    }
  } catch (error) {
    console.error('Error sending data:', error);
    sendStatus(`Error: ${error.message}`, false);
  }
});