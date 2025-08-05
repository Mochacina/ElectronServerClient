// renderer.js

// 디버깅: renderer.js 로드 및 실행 확인
console.log("Yes! I am the one and only Helena's renderer.js!");
console.log('Renderer process is running.');

let selectedSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
  // 디버깅: DOMContentLoaded 이벤트 확인
  console.log('DOM fully loaded and parsed');

  // --- Element Selectors ---
  const sidebar = document.querySelector('.sidebar');
  const resizer = document.getElementById('resizer');
  const foldBtn = document.getElementById('sidebar-fold-btn');
  const mainContentWrapper = document.querySelector('.main-content-wrapper');
  
  const startBtn = document.getElementById('start-server-btn');
  const stopBtn = document.getElementById('stop-server-btn');
  const portInput = document.getElementById('port-input');
  const protocolSelect = document.getElementById('protocol-select');
  const serverStatus = document.getElementById('server-status');
  const sessionCount = document.getElementById('session-count');
  const sessionTableBody = document.querySelector('#session-list-table tbody');
  
  const sessionDetailContainer = document.querySelector('.session-detail-container');
  const detailSessionId = document.getElementById('detail-session-id');
  const detailSessionStats = document.getElementById('detail-session-stats');
  const dataLog = document.getElementById('data-log');
  const dataInput = document.getElementById('data-input');
  const encodingSelect = document.getElementById('encoding-select');
  const sendDataBtn = document.getElementById('send-data-btn');
  const exportLogBtn = document.getElementById('export-log-btn');
  const closeDetailBtn = document.getElementById('close-detail-btn');

  // --- Event Listeners ---
  startBtn.addEventListener('click', () => {
    const port = parseInt(portInput.value, 10);
    const protocol = protocolSelect.value;
    window.api.startServer({ protocol, port });
  });

  stopBtn.addEventListener('click', () => {
    window.api.stopServer();
    selectedSessionId = null;
    updateDetailView(false);
  });

  sendDataBtn.addEventListener('click', () => {
    if (!selectedSessionId) return;
    const data = dataInput.value;
    const encoding = encodingSelect.value;
    if (!data) return;
    window.api.sendData(selectedSessionId, data, encoding);
    dataInput.value = '';
  });

  exportLogBtn.addEventListener('click', () => {
    if (!selectedSessionId) return;
    const logContent = dataLog.innerText;
    if (!logContent) return;
    window.api.exportLog(selectedSessionId, logContent);
  });

  closeDetailBtn.addEventListener('click', () => {
    selectedSessionId = null;
    updateDetailView(false);
  });

  // --- Sidebar Resize & Fold Logic ---
  resizer.addEventListener('mousedown', (e) => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleMouseMove);
    });
  });

  function handleMouseMove(e) {
    const newWidth = e.clientX;
    // 사이드바가 접혀있을 때는 리사이즈 안함
    if (sidebar.classList.contains('folded')) return;
    
    if (newWidth >= 150 && newWidth < 500) {
      sidebar.style.width = `${newWidth}px`;
    }
  }

  foldBtn.addEventListener('click', () => {
    sidebar.classList.toggle('folded');
  });

  // --- IPC Handlers ---
  window.api.onServerStatus((status) => {
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
    const scrollPosition = sessionTableBody.parentElement.scrollTop;
    sessionTableBody.innerHTML = ''; 

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
            row.dataset.sessionId = session.id;
            
            if (session.id === selectedSessionId) {
                row.classList.add('selected');
            }

            row.insertCell().textContent = session.id;
            row.insertCell().textContent = session.status;
            row.insertCell().textContent = new Date(session.connectedTime).toLocaleTimeString();
            row.insertCell().textContent = `${session.rx} / ${session.tx}`;

            row.addEventListener('click', () => {
                const isNewSelection = selectedSessionId !== session.id;
                const previouslySelected = sessionTableBody.querySelector('.selected');
                if (previouslySelected) {
                    previouslySelected.classList.remove('selected');
                }

                if (selectedSessionId === session.id) {
                    selectedSessionId = null;
                    updateDetailView(false);
                } else {
                    // 새로운 세션을 선택한 경우에만 로그를 지운다.
                    if (isNewSelection) {
                        dataLog.innerHTML = '';
                    }
                    selectedSessionId = session.id;
                    row.classList.add('selected');
                    updateDetailView(true, { stats: { rx: session.rx, tx: session.tx } });
                }
            });
        });
    }
    sessionTableBody.parentElement.scrollTop = scrollPosition;

    sessionCount.textContent = `Sessions: ${sessions.filter(s => s.status === 'connected').length}`;
    
    if (selectedSessionId && !sessions.some(s => s.id === selectedSessionId)) {
        selectedSessionId = null;
        updateDetailView(false);
    }
  });

  window.api.onDataLog((log) => {
    // 디버깅: 로그 데이터와 현재 선택된 세션 ID 확인
    console.log(`onDataLog received: log.sessionId=${log.sessionId}, selectedSessionId=${selectedSessionId}`);
    if (log.sessionId === selectedSessionId) {
        console.log('Appending log to dataLog element');
        const logEntry = document.createElement('div');
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        logEntry.className = `log-${log.direction}`;
        
        // main에서 이미 utf8로 보내주므로 Buffer를 사용할 필요가 없다.
        const printableData = log.data.replace(/[\x00-\x1F\x7F-\x9F]/g, '.');

        logEntry.textContent = `[${timestamp}] [${log.direction.toUpperCase()}] ${printableData}`;
        dataLog.appendChild(logEntry);
        dataLog.scrollTop = dataLog.scrollHeight;
    }
  });

  window.api.onUpdateSessionStats((stats) => {
    const sessionRow = sessionTableBody.querySelector(`tr[data-session-id="${stats.id}"]`);
    if (sessionRow) {
      // RX/TX 셀은 4번째(인덱스 3) 셀이야.
      const statsCell = sessionRow.cells[3];
      if (statsCell) {
        statsCell.textContent = `${stats.rx} / ${stats.tx}`;
      }
    }
    // 상세 뷰의 통계도 업데이트
    if (stats.id === selectedSessionId) {
      detailSessionStats.textContent = `${stats.rx} / ${stats.tx}`;
    }
  });

  // --- UI Update Functions ---
  function updateDetailView(show, options = {}) {
    const { stats = null } = options;
    if (show) {
        mainContentWrapper.classList.add('detail-view-active');
        sessionDetailContainer.classList.remove('hidden');
        detailSessionId.textContent = selectedSessionId;
        
        if (stats) {
          detailSessionStats.textContent = `${stats.rx} / ${stats.tx}`;
        } else {
          // stats가 없으면 테이블에서 직접 찾아서 설정
          const sessionRow = sessionTableBody.querySelector(`tr[data-session-id="${selectedSessionId}"]`);
          if (sessionRow && sessionRow.cells[3]) {
            detailSessionStats.textContent = sessionRow.cells[3].textContent;
          } else {
            detailSessionStats.textContent = '0 / 0'; // 최후의 보루
          }
        }
    } else {
        mainContentWrapper.classList.remove('detail-view-active');
        sessionDetailContainer.classList.add('hidden');
    }
  }

  // Initial state
  updateDetailView(false);
});