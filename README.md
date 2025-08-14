# Electron TCP/UDP Test Tool

이 프로젝트는 Electron과 Node.js를 기반으로 제작된 TCP/UDP 네트워크 테스트 도구입니다. 서버 역할을 하는 `EServer`와 클라이언트 역할을 하는 `EClient` 두 개의 애플리케이션으로 구성되어 있습니다.

## 주요 기능

### EServer
- **멀티 프로토콜 지원:** TCP 및 UDP 서버를 손쉽게 생성하고 관리할 수 있습니다.
- **실시간 세션 관리:** 서버에 접속된 클라이언트 세션 목록을 실시간으로 확인하고, 각 세션의 상태(연결, 종료, 에러)를 추적합니다.
- **데이터 송수신 및 로깅:** 각 세션별로 데이터를 주고받을 수 있으며, 모든 송수신 내역은 타임스탬프와 함께 로그에 기록됩니다.
- **세션 상세 뷰:** 특정 세션을 선택하여 주고받은 데이터 로그를 상세하게 확인할 수 있습니다.
- **세션 제어:** 서버에서 특정 클라이언트 세션의 연결을 강제로 종료할 수 있습니다.
- **유연한 UI:** VSCode 스타일의 다크 테마와 함께, 사용자가 직접 패널의 크기를 조절할 수 있는 유연한 UI를 제공합니다.

### EClient
- **간편한 접속:** TCP 또는 UDP 프로토콜을 선택하고, 서버의 IP와 포트를 입력하여 간단하게 서버에 접속할 수 있습니다.
- **데이터 송수신:** 서버와 실시간으로 데이터를 주고받을 수 있으며, 다양한 인코딩(UTF-8, Hex, Base64)을 지원합니다.
- **실시간 로그:** 서버와의 모든 통신 내역이 타임스탬프와 함께 로그 창에 표시됩니다.
- **직관적인 UI:** 서버 프로그램과 통일된 디자인으로, 연결 상태, 통신량(RX/TX), 연결 시간 등 주요 정보를 한눈에 파악할 수 있습니다.

## 기술 스택
- **Framework:** [Electron](https://www.electronjs.org/)
- **Runtime:** [Node.js](https://nodejs.org/)
- **Core Modules:** `net` (TCP), `dgram` (UDP)

## 설치 및 실행 방법

이 프로젝트를 실행하기 위해서는 각 애플리케이션별로 종속성을 설치해야 합니다.

1. 먼저 이 저장소를 클론하거나 다운로드합니다.
2. 각 프로젝트 디렉토리로 이동하여 `npm install` 명령을 실행합니다.

```bash
# EServer 설치
cd EServer
npm install

# EClient 설치
cd ../EClient
npm install
```

3.  각 디렉토리에서 `npm start` 명령으로 애플리케이션을 실행합니다.

```bash
# EServer 실행
cd EServer
npm start

# EClient 실행
cd ../EClient
npm start
```

---

© 2025 *Brie and Helena*. All rights reserved.

개인적, 비상업적 용도의 사용은 출처 표시와 함께 자유롭게 허용됩니다.
상업적 이용이나 2차 저작물 제작시에는 사전 동의가 필요합니다.

Personal and non-commercial use permitted with proper attribution.
Commercial use or derivative works require prior written consent.