# Admin Authentication System Setup Guide

## 개요

API 키 기반 인증에서 세션 기반 관리자 로그인 시스템으로 변경되었습니다.
- 사용자명/비밀번호 기반 로그인
- 세션 쿠키를 통한 인증 유지
- Supabase PostgreSQL에 사용자 정보 저장
- **관리자 승인 시스템**: 회원가입 후 관리자 승인 필요 (identify = true)

## 1. 데이터베이스 마이그레이션

### 1.1 SQL 마이그레이션 실행

Supabase 대시보드에서 다음 순서로 실행:

1. **Supabase Dashboard** 접속 → **SQL Editor**로 이동
2. `migrations/create_admin_auth_tables.sql` 파일의 내용을 복사
3. SQL Editor에 붙여넣기 후 **Run** 클릭

생성되는 테이블:
- `admin_users` - 관리자 계정 정보 (username, password_hash, email, **identify**)
- `admin_sessions` - 세션 관리

**중요**: `identify` 필드는 사용자 승인 상태를 나타냅니다.
- `FALSE` (기본값): 승인 대기 중 - 로그인 불가
- `TRUE`: 승인됨 - 로그인 가능

### 1.2 첫 관리자 계정 생성

bcrypt로 비밀번호 해시를 생성해야 합니다.

#### 방법 1: Node.js 스크립트 사용

```javascript
// scripts/create-admin.js
import bcrypt from 'bcrypt';

const password = 'your-secure-password'; // 원하는 비밀번호로 변경
const hash = await bcrypt.hash(password, 10);
console.log('Password hash:', hash);
```

실행:
```bash
node scripts/create-admin.js
```

#### 방법 2: Supabase SQL Editor에서 직접 실행

```sql
-- bcrypt 해시를 직접 생성 (온라인 bcrypt generator 사용)
-- 예: https://bcrypt-generator.com/

INSERT INTO admin_users (username, password_hash, email)
VALUES (
  'admin',
  '$2b$10$YourActualBcryptHashHere',  -- 실제 bcrypt 해시로 교체
  'admin@example.com'
);
```

## 2. NPM 패키지 설치

```bash
npm install bcrypt
```

또는 의존성 재설치:

```bash
npm install
```

## 3. 서버 재시작

```bash
npm start
```

## 4. 로그인 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 이전에는 보이지 않던 **로그인** 버튼 확인
3. `/auth/login` 페이지로 이동
4. 생성한 관리자 계정으로 로그인

## 5. 나머지 페이지 네비게이션 업데이트

현재 `home.js`와 `tracker.js`만 로그인/로그아웃 버튼이 추가되었습니다.
나머지 페이지들도 동일한 패턴으로 업데이트하세요:

### 업데이트가 필요한 페이지
- [ ] `proceeding.js`
- [ ] `dashboard.js`
- [ ] `pattern.js`
- [ ] `control.js`
- [ ] `apiGuide.js`

### 네비게이션 업데이트 패턴

#### 보호된 페이지 (requireAuth 적용된 페이지)

1. **HTML 변경**: API 키 쿼리 파라미터 제거 + 로그아웃 버튼 추가

```html
<!-- 기존 -->
<div class="top-nav-links">
  <a href="/apiguide" class="top-nav-link">API Guide</a>
  <a href="/control?api_key=${req.query.api_key}" class="top-nav-link">Control</a>
  <!-- ... -->
  <a href="/" class="top-nav-link" style="margin-left: auto;">🏠 Home</a>
</div>

<!-- 변경 후 -->
<div class="top-nav-links">
  <a href="/apiguide" class="top-nav-link">API Guide</a>
  <a href="/control" class="top-nav-link">Control</a>
  <!-- ... -->
  <div class="top-nav-right">
    <span class="top-nav-user">👤 ${req.user.username}</span>
    <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
    <a href="/" class="top-nav-link">🏠 Home</a>
  </div>
</div>
```

2. **CSS 추가**:

```css
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

.top-nav-logout {
  background: #c62828;
  color: #ffffff;
}

.top-nav-logout:hover {
  background: #a82020;
}
```

#### 공개 페이지 (home.js, apiGuide.js)

로그인 상태에 따라 다른 버튼 표시:

```html
<div class="top-nav-right">
  ${req.user ? `
    <span class="top-nav-user">👤 ${req.user.username}</span>
    <a href="/auth/logout" class="top-nav-link top-nav-logout">로그아웃</a>
  ` : `
    <a href="/auth/login" class="top-nav-link top-nav-login">로그인</a>
  `}
  <a href="/" class="top-nav-link active">🏠 Home</a>
</div>
```

추가 CSS:

```css
.top-nav-login {
  background: #0066cc;
  color: #ffffff;
}

.top-nav-login:hover {
  background: #0052a3;
}
```

## 6. API 키 검증 코드 제거

각 페이지 핸들러에서 `validateApiKey()` 함수 호출 제거:

```javascript
// 제거할 코드
function validateApiKey(req) {
  const validKey = process.env.CONTROL_API_KEY || process.env.FMP_API_KEY;
  // ...
}

if (!validateApiKey(req)) {
  return sendUnauthorized(res);
}
```

→ `requireAuth` 미들웨어가 이미 `index.js`에서 적용되었으므로 불필요

## 7. 세션 관리

### 세션 만료 정리 (선택사항)

만료된 세션을 주기적으로 정리하려면 cron job 설정:

```javascript
// src/services/scheduler.js에 추가
import { cleanupExpiredSessions } from '../lib/sessionManager.js';

// 매일 자정에 만료된 세션 정리
cron.schedule('0 0 * * *', async () => {
  await cleanupExpiredSessions();
});
```

### 세션 설정

`src/lib/sessionManager.js`에서 설정 가능:
- `SESSION_DURATION`: 세션 유효 기간 (기본 24시간)
- `SESSION_COOKIE_NAME`: 쿠키 이름 (기본 'admin_session')

## 8. 보안 권장사항

1. **환경 변수 설정** (.env):
   ```
   NODE_ENV=production  # 프로덕션에서 Secure 쿠키 활성화
   ```

2. **HTTPS 사용**: 프로덕션 환경에서는 반드시 HTTPS 사용

3. **강력한 비밀번호**: 관리자 계정 비밀번호는 최소 12자 이상, 특수문자 포함

4. **정기적인 세션 정리**: 위의 cron job 설정 권장

## 9. 트러블슈팅

### 로그인 후 즉시 로그아웃되는 경우

- 쿠키가 제대로 설정되지 않음
- 브라우저 개발자 도구 → Application → Cookies 확인
- `admin_session` 쿠키가 있는지 확인

### "세션이 만료되었습니다" 오류

- 세션 유효 기간이 지났거나 DB에서 세션이 삭제됨
- 다시 로그인 필요

### bcrypt 설치 오류 (Windows)

```bash
npm install --global windows-build-tools
npm install bcrypt
```

## 10. API 엔드포인트 변경사항

### 제거된 기능
- ❌ API 키 쿼리 파라미터 (`?api_key=...`)
- ❌ API 키 기반 인증

### 추가된 엔드포인트
- ✅ `GET /auth/login` - 로그인 페이지
- ✅ `POST /auth/login` - 로그인 처리
- ✅ `GET /auth/signup` - 회원가입 페이지
- ✅ `POST /auth/signup` - 회원가입 처리
- ✅ `GET /auth/logout` - 로그아웃

### 보호된 엔드포인트 (로그인 필요)
모든 기존 API 엔드포인트는 로그인 없이 접근 시 `/auth/login`으로 리다이렉트:
- `/getEvent`, `/getEventLatest`, `/getValuation`
- `/tracker`, `/proceeding`, `/dashboard`, `/pattern`
- `/control`, `/symbolCache`
- 기타 모든 API 엔드포인트

### 공개 엔드포인트 (로그인 불필요)
- `/` - 홈페이지
- `/apiguide` - API 가이드
- `/health` - 헬스 체크
- `/auth/*` - 인증 관련 페이지
