# Design Unification Specification

## 문서 개요

본 문서는 Financial Event API 프로젝트의 전체 페이지 디자인 통일 및 인증 시스템 규격을 정의합니다.
모든 페이지는 일관된 디자인 시스템을 따라야 하며, 동일한 제품의 하위 페이지임을 명확히 인식할 수 있어야 합니다.

**최종 업데이트**: 2025-12-03
**작성자**: Claude Code Assistant
**버전**: 2.0 (인증 시스템 통합)

---

## 1. 디자인 시스템

### 1.1 색상 팔레트

모든 페이지는 다음 색상 변수를 사용해야 합니다:

```css
:root {
  /* 페이지 배경 */
  --bg-page: #999999;              /* 메인 페이지 배경 (회색) */
  --bg-content: #ffffff;           /* 콘텐츠 박스 (흰색) */
  --bg-sidebar: #2b2b2b;           /* 사이드바 배경 (다크) */
  --bg-input: #fafafa;             /* 입력 필드 배경 */
  --bg-hover: #f5f5f5;             /* 호버 상태 */

  /* 테두리 */
  --border-default: #dddddd;       /* 기본 테두리 */
  --border-dark: #1a1a1a;          /* 다크 테두리 (사이드바용) */

  /* 텍스트 */
  --text-primary: #111111;         /* 메인 텍스트 (다크) */
  --text-secondary: #666666;       /* 보조 텍스트 */
  --text-muted: #999999;           /* 비활성 텍스트 */
  --text-light: #e0e0e0;           /* 밝은 텍스트 (다크 배경용) */

  /* 액센트 컬러 */
  --accent-blue: #0066cc;          /* 주요 액션, 링크 */
  --accent-blue-hover: #0052a3;    /* 호버 상태 */
  --success: #2e7d32;              /* 성공 (녹색) */
  --error: #c62828;                /* 에러 (빨간색) */
  --warning: #f57c00;              /* 경고 (주황색) */
  --info: #0066cc;                 /* 정보 (파란색) */
}
```

### 1.2 타이포그래피

```css
body {
  font-family: 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
}

h1 { font-size: 1.75rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
h4 { font-size: 1.1rem; font-weight: 500; }
```

### 1.3 간격 시스템

```css
/* Padding */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* Gaps */
--gap-xs: 4px;
--gap-sm: 8px;
--gap-md: 12px;
--gap-lg: 16px;
```

---

## 2. 상단 네비게이션 바

### 2.1 구조

모든 페이지는 동일한 상단 네비게이션 바를 가져야 합니다:

```html
<nav class="top-nav">
  <a href="/" class="top-nav-brand">📊 Financial API</a>
  <button class="top-nav-toggle" onclick="document.querySelector('.top-nav-links').classList.toggle('open')">☰</button>
  <div class="top-nav-links">
    <a href="/apiguide" class="top-nav-link">API Guide</a>
    <a href="/control" class="top-nav-link">Control</a>
    <a href="/tracker" class="top-nav-link">Tracker</a>
    <a href="/proceeding" class="top-nav-link">Proceeding</a>
    <a href="/dashboard" class="top-nav-link">Dashboard</a>
    <a href="/pattern" class="top-nav-link">Pattern</a>

    <!-- 인증 버튼 영역 -->
    <div class="top-nav-right">
      <!-- 로그인된 경우 -->
      <span class="top-nav-user">👤 사용자명</span>
      <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>

      <!-- 또는 로그인되지 않은 경우 -->
      <!-- <a href="/auth/login" class="top-nav-link top-nav-login">로그인</a> -->

      <a href="/" class="top-nav-link">🏠 Home</a>
    </div>
  </div>
</nav>
```

### 2.2 스타일

```css
.top-nav {
  background: #2b2b2b;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 60px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3000;
  border-bottom: 1px solid #1a1a1a;
}

.top-nav-brand {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e0e0e0;
  text-decoration: none;
  white-space: nowrap;
}

.top-nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.top-nav-link {
  padding: 8px 16px;
  border-radius: 6px;
  color: #c0c0c0;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.top-nav-link:hover {
  background: #3a3a3a;
  color: #ffffff;
}

.top-nav-link.active {
  background: #0066cc;
  color: #ffffff;
}

/* 인증 버튼 영역 */
.top-nav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-nav-user {
  padding: 8px 12px;
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.top-nav-login {
  background: #0066cc;
  color: #ffffff;
}

.top-nav-login:hover {
  background: #0052a3;
}

.top-nav-logout {
  background: #c62828;
  color: #ffffff;
}

.top-nav-logout:hover {
  background: #a82020;
}

/* 모바일 토글 버튼 */
.top-nav-toggle {
  display: none;
  background: none;
  border: none;
  color: #e0e0e0;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
}

@media (max-width: 1024px) {
  .top-nav-toggle {
    display: block;
  }

  .top-nav-links {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    background: #2b2b2b;
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 8px;
    transform: translateY(-100%);
    opacity: 0;
    transition: all 0.3s;
    pointer-events: none;
  }

  .top-nav-links.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: all;
  }
}
```

---

## 3. 사이드바 레이아웃

### 3.1 페이지 구조

콘텐츠가 많은 페이지는 사이드바를 포함해야 합니다:

```html
<div class="page-wrapper">
  <aside class="toc-sidebar">
    <div class="toc-title">페이지 제목</div>
    <ul class="toc-list">
      <li class="toc-item"><a href="#section1" class="toc-link">섹션 1</a></li>
      <li class="toc-item"><a href="#section2" class="toc-link">섹션 2</a></li>
    </ul>

    <!-- 글로벌 상태 위젯 -->
    <div class="sidebar-status-widget">
      <!-- ... -->
    </div>
  </aside>

  <div class="content-wrapper">
    <div class="container">
      <!-- 메인 콘텐츠 -->
    </div>
  </div>
</div>
```

### 3.2 사이드바 스타일

```css
.page-wrapper {
  display: flex;
  min-height: 100vh;
  padding-top: 60px; /* 상단 네비게이션 높이 */
}

.toc-sidebar {
  width: 280px;
  background: #2b2b2b;
  color: #e0e0e0;
  position: fixed;
  top: 60px;
  left: 0;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 24px 16px;
  border-right: 1px solid #1a1a1a;
  z-index: 1000;
}

.content-wrapper {
  margin-left: 280px;
  flex: 1;
  background: #999999;
  padding: 32px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}
```

---

## 4. 인증 시스템 (Authentication System)

### 4.1 개요

**변경 사항**: API 키 기반 인증 → 세션 기반 관리자 로그인

- **이전**: 모든 페이지에 `?api_key=...` 쿼리 파라미터 필요
- **현재**: 사용자명/비밀번호 로그인 → 세션 쿠키로 인증 유지

### 4.2 데이터베이스 테이블

#### admin_users 테이블

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,              -- bcrypt 해시
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

#### admin_sessions 테이블

```sql
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,        -- 64자 hex 문자열
  expires_at TIMESTAMPTZ NOT NULL,           -- 24시간 후
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
```

### 4.3 인증 흐름

1. **회원가입**: `/auth/signup` → bcrypt로 비밀번호 해시 → DB 저장
2. **로그인**: `/auth/login` → 비밀번호 검증 → 세션 생성 → 쿠키 설정
3. **인증 확인**: 쿠키의 `session_token`으로 DB 조회 → `req.user` 설정
4. **로그아웃**: `/auth/logout` → DB에서 세션 삭제 → 쿠키 제거

### 4.4 보호된 vs 공개 엔드포인트

#### 공개 엔드포인트 (로그인 불필요)

- `GET /` - 홈페이지
- `GET /apiguide` - API 가이드
- `GET /health` - 헬스 체크
- `GET /auth/login` - 로그인 페이지
- `POST /auth/login` - 로그인 처리
- `GET /auth/signup` - 회원가입 페이지
- `POST /auth/signup` - 회원가입 처리

#### 보호된 엔드포인트 (로그인 필요)

모든 기능 페이지와 API 엔드포인트:
- `/tracker`, `/proceeding`, `/dashboard`, `/pattern`, `/control`
- `/getEvent`, `/getEventLatest`, `/getValuation`
- `/priceTracker`, `/trackedPrice`, `/symbolCache`
- 기타 모든 데이터 조회/수정 API

### 4.5 미들웨어 구조

```javascript
// src/middleware/auth.js

// 1. requireAuth: 로그인 필수 (없으면 /auth/login으로 리다이렉트)
export async function requireAuth(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);
  const user = await validateSession(sessionToken);

  if (!user) {
    return res.redirect('/auth/login');
  }

  req.user = user; // { userId, username, email, sessionId }
  next();
}

// 2. attachUserIfAuthenticated: 선택적 로그인 (공개 페이지용)
export async function attachUserIfAuthenticated(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);
  const user = await validateSession(sessionToken);

  if (user) {
    req.user = user;
  }

  next();
}

// 3. redirectIfAuthenticated: 로그인된 사용자는 홈으로 (로그인/회원가입 페이지용)
export async function redirectIfAuthenticated(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);
  const user = await validateSession(sessionToken);

  if (user) {
    return res.redirect('/');
  }

  next();
}
```

### 4.6 인증 관련 UI 가이드

#### 로그인 페이지 (`/auth/login`)

- 깔끔한 중앙 정렬 폼
- 배경: #999999 (회색)
- 폼 카드: #ffffff (흰색) with 테두리 #dddddd
- 아이디/비밀번호 입력 필드
- 파란색 로그인 버튼 (#0066cc)
- 회원가입 페이지 링크

#### 회원가입 페이지 (`/auth/signup`)

- 로그인 페이지와 동일한 디자인
- 추가 필드: 이메일 (선택), 비밀번호 확인
- 클라이언트 측 비밀번호 일치 검증
- 로그인 페이지 링크

#### 네비게이션 바 인증 UI

**로그인되지 않은 경우**:
```html
<div class="top-nav-right">
  <a href="/auth/login" class="top-nav-link top-nav-login">로그인</a>
  <a href="/" class="top-nav-link">🏠 Home</a>
</div>
```

**로그인된 경우**:
```html
<div class="top-nav-right">
  <span class="top-nav-user">👤 ${req.user.username}</span>
  <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
  <a href="/" class="top-nav-link">🏠 Home</a>
</div>
```

### 4.7 세션 보안

- **쿠키 이름**: `admin_session`
- **유효 기간**: 24시간
- **HttpOnly**: true (JavaScript 접근 불가)
- **SameSite**: Lax
- **Secure**: true (프로덕션 환경, HTTPS)
- **비밀번호 해시**: bcrypt (rounds=10)

---

## 5. 글로벌 상태 위젯

### 5.1 위치

모든 페이지의 **사이드바 하단**에 API 호출 상태를 표시하는 위젯 배치

### 5.2 구조

```html
<div class="sidebar-status-widget">
  <div class="status-widget-title">API Status</div>
  <div class="status-widget-box" id="globalStatusWidget">
    <div class="status-widget-header">
      <div class="status-widget-spinner"></div>
      <span id="globalStatusText">⏸️ 대기 중</span>
    </div>
    <div class="status-widget-progress">
      <div class="status-widget-progress-bar">
        <div class="status-widget-progress-fill" id="globalStatusProgressFill"></div>
      </div>
      <div class="status-widget-info">
        <span id="globalStatusProgress">0/0 (0%)</span>
        <span id="globalStatusEta">--:--</span>
      </div>
    </div>
    <div class="status-widget-stats">
      <div class="status-widget-stat">
        <span>✅ 성공</span>
        <strong id="globalStatusSuccess">0</strong>
      </div>
      <div class="status-widget-stat">
        <span>❌ 실패</span>
        <strong id="globalStatusFail">0</strong>
      </div>
      <div class="status-widget-stat">
        <span>⏭️ 스킵</span>
        <strong id="globalStatusSkip">0</strong>
      </div>
      <div class="status-widget-stat">
        <span>🔄 업데이트</span>
        <strong id="globalStatusUpdate">0</strong>
      </div>
    </div>
  </div>
</div>
```

### 5.3 스타일

```css
.sidebar-status-widget {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #3a3a3a;
}

.status-widget-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.status-widget-box {
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 12px;
}

.status-widget-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: #e0e0e0;
  font-weight: 500;
}

.status-widget-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #3a3a3a;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: none;
}

.status-widget-box.running .status-widget-spinner {
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-widget-progress-bar {
  height: 6px;
  background: #0a0a0a;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.status-widget-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0066cc, #2e7d32);
  width: 0%;
  transition: width 0.3s ease;
}

.status-widget-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #888888;
}

.status-widget-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 0.7rem;
  margin-top: 10px;
}

.status-widget-stat {
  display: flex;
  justify-content: space-between;
  color: #c0c0c0;
}

.status-widget-stat strong {
  color: #ffffff;
}
```

---

## 6. 페이지별 체크리스트

### ✅ 완료된 페이지

#### home.js
- [x] 상단 네비게이션 바 (로그인/로그아웃 버튼 포함)
- [x] 조건부 인증 UI (attachUserIfAuthenticated)
- [x] 색상 팔레트 적용
- [x] 반응형 레이아웃

#### tracker.js
- [x] 상단 네비게이션 바 (로그인/로그아웃 버튼 포함)
- [x] 사이드바 레이아웃
- [x] 글로벌 상태 위젯
- [x] 색상 팔레트 적용 (다크 → 라이트)
- [x] API 키 쿼리 파라미터 제거

#### proceeding.js
- [x] 사이드바 레이아웃
- [x] 글로벌 상태 위젯
- [x] 색상 팔레트 적용 (다크 → 라이트)
- [ ] 상단 네비게이션 업데이트 필요

### 🔄 업데이트 필요

#### dashboard.js
- [x] 색상 팔레트 적용
- [x] 글로벌 상태 위젯
- [ ] 상단 네비게이션 업데이트 (로그인/로그아웃 버튼)
- [ ] API 키 쿼리 파라미터 제거

#### pattern.js
- [x] 색상 팔레트 적용
- [x] 글로벌 상태 위젯
- [ ] 상단 네비게이션 업데이트 (로그인/로그아웃 버튼)
- [ ] API 키 쿼리 파라미터 제거

#### control.js
- [x] 글로벌 상태 위젯
- [ ] 상단 네비게이션 업데이트 (로그인/로그아웃 버튼)
- [ ] API 키 쿼리 파라미터 제거

#### apiGuide.js
- [x] 글로벌 상태 위젯
- [ ] 상단 네비게이션 업데이트 (로그인/로그아웃 버튼)
- [ ] 조건부 인증 UI (공개 페이지)

---

## 7. 구현 우선순위

1. **필수 (Critical)**: 인증 시스템 통합
   - [x] 데이터베이스 테이블 생성
   - [x] 인증 미들웨어
   - [x] 로그인/회원가입 페이지
   - [ ] 모든 페이지 네비게이션 업데이트

2. **높음 (High)**: UI 일관성
   - [x] 색상 팔레트 적용
   - [x] 사이드바 레이아웃 통일
   - [ ] 모든 페이지 API 키 제거

3. **중간 (Medium)**: 기능 통합
   - [x] 글로벌 상태 위젯
   - [ ] 세션 정리 cron job

4. **낮음 (Low)**: 개선사항
   - [ ] 반응형 최적화
   - [ ] 접근성 개선
   - [ ] 다크 모드 토글

---

## 8. 테스트 체크리스트

### 인증 테스트

- [ ] 회원가입이 정상 작동하는가?
- [ ] 로그인 후 세션이 유지되는가?
- [ ] 로그아웃 후 보호된 페이지 접근 시 로그인 페이지로 리다이렉트되는가?
- [ ] 잘못된 비밀번호로 로그인 시 에러가 표시되는가?
- [ ] 세션 만료 후 자동으로 로그아웃되는가?

### UI 일관성 테스트

- [ ] 모든 페이지의 상단 네비게이션이 동일한가?
- [ ] 색상 팔레트가 일관되게 적용되었는가?
- [ ] 로그인/로그아웃 버튼이 모든 페이지에 표시되는가?
- [ ] 사용자 이름이 올바르게 표시되는가?

### 기능 테스트

- [ ] API 엔드포인트가 정상 작동하는가?
- [ ] 상태 위젯이 모든 페이지에 표시되는가?
- [ ] 반응형 레이아웃이 모바일에서도 정상인가?

---

## 9. 참고 문서

- `AUTHENTICATION_SETUP.md`: 인증 시스템 설정 가이드
- `migrations/create_admin_auth_tables.sql`: 데이터베이스 마이그레이션
- `src/lib/sessionManager.js`: 세션 관리 유틸리티
- `src/middleware/auth.js`: 인증 미들웨어
- `src/api/endpoints/auth.js`: 로그인/회원가입 엔드포인트

---

## 10. 변경 이력

### v2.0 (2025-12-03)
- 인증 시스템 추가 (API 키 → 세션 기반 로그인)
- 로그인/로그아웃 UI 추가
- 보호된/공개 엔드포인트 분리

### v1.0 (2025-11-25)
- 초기 디자인 시스템 정의
- 색상 팔레트 통일
- 사이드바 레이아웃 표준화
- 글로벌 상태 위젯 추가
