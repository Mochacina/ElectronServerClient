// 디버깅: renderer.js 로드 및 실행 확인
console.log("Yes! I am the one and only Helena's renderer.js!");
console.log('Renderer process is running.');

document.addEventListener('DOMContentLoaded', () => {
  // 디버깅: DOMContentLoaded 이벤트 확인
  console.log('DOM fully loaded and parsed');

  const startBtn = document.getElementById('start-server-btn');
  const stopBtn = document.getElementById('stop-server-btn');
  const portInput = document.getElementById('port-input');
  const protocolSelect = document.getElementById('protocol-select');
  const serverStatus = document.getElementById('server-status');

  // 디버깅: UI 요소 가져오기 확인
  if (startBtn) console.log('Start button found');
  if (stopBtn) console.log('Stop button found');
  if (portInput) console.log('Port input found');
  if (serverStatus) console.log('Server status element found');

  startBtn.addEventListener('click', () => {
    const port = parseInt(portInput.value, 10);
    const protocol = protocolSelect.value;
    
    // 디버깅: Start button clicked
    console.log(`Start button clicked. Protocol: ${protocol}, Port: ${port}`);
    
    if (isNaN(port) || port <= 0 || port > 65535) {
      alert('Hmph! Invalid port number. Enter a number between 1 and 65535.');
      return;
    }

    window.api.startServer({ protocol, port });
  });

  stopBtn.addEventListener('click', () => {
    // 디버깅: Stop button clicked
    console.log('Stop button clicked.');
    window.api.stopServer();
  });

  // 메인 프로세스로부터 오는 서버 상태 업데이트 수신
  window.api.onServerStatus((status) => {
    // 디버깅: onServerStatus 수신
    console.log('renderer: received server-status', status);
    
    serverStatus.textContent = `Status: ${status.message}`;

    if (status.listening) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      portInput.disabled = true;
      protocolSelect.disabled = true;
      serverStatus.parentElement.style.backgroundColor = '#89d185'; // Success color
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      portInput.disabled = false;
      protocolSelect.disabled = false;
      serverStatus.parentElement.style.backgroundColor = 'var(--accent-color)'; // Default color
    }
  });
});