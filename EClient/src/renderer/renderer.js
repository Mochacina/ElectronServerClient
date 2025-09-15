document.addEventListener('DOMContentLoaded', () => {
  // --- Element Selectors ---
  const protocolSelect = document.getElementById('protocol-select');
  const ipInput = document.getElementById('ip-input');
  const portInput = document.getElementById('port-input');
  const connectBtn = document.getElementById('connect-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');

  const statusEl = document.getElementById('connection-status');
  const connectedTimeEl = document.getElementById('connected-time');
  const statsEl = document.getElementById('rx-tx-stats');
  
  const dataLog = document.getElementById('data-log');
  const dataInput = document.getElementById('data-input');
  const encodingSelect = document.getElementById('encoding-select');
  const sendBtn = document.getElementById('send-data-btn');

  // --- Event Listeners ---
  connectBtn.addEventListener('click', () => {
    const options = {
      protocol: protocolSelect.value,
      host: ipInput.value,
      port: parseInt(portInput.value, 10),
    };
    window.api.connect(options);
  });

  disconnectBtn.addEventListener('click', () => {
    window.api.disconnect();
  });

  const sendData = () => {
    const data = dataInput.value;
    if (!data) return;
    window.api.sendData(data, encodingSelect.value);
    dataInput.value = '';
  };

  sendBtn.addEventListener('click', sendData);

  dataInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendData();
    }
  });

  // --- IPC Handlers ---
  window.api.onStatusChange((status) => {
    console.log('Status changed:', status);
    statusEl.textContent = status.message;

    if (status.connected) {
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      protocolSelect.disabled = true;
      ipInput.disabled = true;
      portInput.disabled = true;
      connectedTimeEl.textContent = new Date().toLocaleString();
    } else {
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      protocolSelect.disabled = false;
      ipInput.disabled = false;
      portInput.disabled = false;
      connectedTimeEl.textContent = 'N/A';
    }
  });

  window.api.onData((log) => {
    console.log('Data received:', log);
    const logEntry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    logEntry.className = `log-${log.direction}`;
    
    const printableData = log.data.replace(/[\x00-\x1F\x7F-\x9F]/g, '.');
    logEntry.textContent = `[${timestamp}] [${log.direction.toUpperCase()}] ${printableData}`;
    dataLog.appendChild(logEntry);
    dataLog.scrollTop = dataLog.scrollHeight;
  });

  window.api.onStatsUpdate((stats) => {
    console.log('Stats updated:', stats);
    statsEl.textContent = `${stats.tx} / ${stats.rx}`;
  });

});