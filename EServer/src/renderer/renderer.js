// 디버깅: renderer.js 로드 및 실행 확인
console.log("Yes! I am the one and only Helena's renderer.js!");
console.log('Renderer process is running.');

let selectedSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
  // 디버깅: DOMContentLoaded 이벤트 확인
  console.log('DOM fully loaded and parsed');

  // --- Element Selectors ---
  const startBtn = document.getElementById('start-server-btn');
  const stopBtn = document.getElementById('stop-server-btn');
  const portInput = document.getElementById('port-input');
  const protocolSelect = document.getElementById('protocol-select');
  const serverStatus = document.getElementById('server-status');
  const sessionCount = document.getElementById('session-count');
  const sessionTableBody = document.querySelector('#session-list-table tbody');
  
  const sessionDetailPlaceholder = document.getElementById('session-detail-content');
  const sessionDetailView = document.getElementById('session-detail-view');
  const detailSessionId = document.getElementById('detail-session-id');
  const dataLog = document.getElementById('data-log');
  const dataInput = document.getElementById('data-input');
  const encodingSelect = document.getElementById('encoding-select');
  const sendDataBtn = document.getElementById('send-data-btn');

  // --- Event Listeners ---
  startBtn.addEventListener('click', () => {
    const port = parseInt(portInput.value, 10);
    const protocol = protocolSelect.value;
    
    console.log(`Start button clicked. Protocol: ${protocol}, Port: ${port}`);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
      alert('Hmph! Invalid port number. Enter a number between 1 and 65535.');
      return;
    }

    window.api.startServer({ protocol, port });
  });

  stopBtn.addEventListener('click', () => {
    console.log('Stop button clicked.');
    window.api.stopServer();
    selectedSessionId = null;
    updateDetailView();
  });

  sendDataBtn.addEventListener('click', () => {
    if (!selectedSessionId) {
        alert('Hmph! No session selected to send data to!');
        return;
    }
    const data = dataInput.value;
    const encoding = encodingSelect.value;
    if (!data) return;

    console.log(`Sending data to ${selectedSessionId}`);
    window.api.sendData(selectedSessionId, data, encoding);
    dataInput.value = ''; // 입력창 비우기
  });

  // --- IPC Handlers ---
  window.api.onServerStatus((status) => {
    console.log('renderer: received server-status', status);
    serverStatus.textContent = `Status: ${status.message}`;

    if (status.listening) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      portInput.disabled = true;
      protocolSelect.disabled = true;
      serverStatus.parentElement.style.backgroundColor = '#89d185';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      portInput.disabled = false;
      protocolSelect.disabled = false;
      serverStatus.parentElement.style.backgroundColor = 'var(--accent-color)';
    }
  });

  window.api.onSessionUpdate((sessions) => {
    console.log('renderer: received update-session-list', sessions);
    sessionTableBody.innerHTML = ''; // 테이블 비우기

    if (sessions.length === 0) {
        const row = sessionTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = 'No active sessions... yet!';
        cell.style.textAlign = 'center';
    } else {
        sessions.forEach(session => {
            const row = sessionTableBody.insertRow();
            row.className = `status-${session.status}`;
            row.dataset.sessionId = session.id; // 행에 세션 ID 저장
            
            row.insertCell().textContent = session.id;
            row.insertCell().textContent = session.status;
            row.insertCell().textContent = new Date(session.connectedTime).toLocaleTimeString();
            row.insertCell().textContent = `${session.rx} / ${session.tx}`;

            row.addEventListener('click', () => {
                selectedSessionId = session.id;
                console.log(`Selected session: ${selectedSessionId}`);
                updateDetailView();
            });
        });
    }

    sessionCount.textContent = `Sessions: ${sessions.filter(s => s.status === 'connected').length}`;
    
    // 선택된 세션이 사라졌으면 상세 뷰도 초기화
    if (selectedSessionId && !sessions.some(s => s.id === selectedSessionId)) {
        selectedSessionId = null;
        updateDetailView();
    }
  });

  window.api.onDataLog((log) => {
    console.log('renderer: received data-log', log);
    if (log.sessionId === selectedSessionId) {
        const logEntry = document.createElement('div');
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        logEntry.className = `log-${log.direction}`;
        logEntry.textContent = `[${timestamp}] [${log.direction.toUpperCase()}] ${log.data}`;
        dataLog.appendChild(logEntry);
        dataLog.scrollTop = dataLog.scrollHeight; // 자동 스크롤
    }
  });

  // --- UI Update Functions ---
  function updateDetailView() {
    if (selectedSessionId) {
        sessionDetailPlaceholder.classList.add('hidden');
        sessionDetailView.classList.remove('hidden');
        detailSessionId.textContent = selectedSessionId;
        dataLog.innerHTML = ''; // 새 세션 선택 시 로그 비우기
    } else {
        sessionDetailPlaceholder.classList.remove('hidden');
        sessionDetailView.classList.add('hidden');
    }
  }

  // 초기 상태 설정
  updateDetailView();
});