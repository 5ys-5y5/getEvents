# 환경변수 암호화 시스템 구현 변경 사항

## 📋 개요

GitHub에서 풀 받은 이후, 환경변수와 API 키를 안전하게 관리하기 위한 암호화 시스템을 구현했습니다. 이 시스템은 민감한 정보를 암호화하여 저장하고, Control Panel에서 GUI로 관리할 수 있도록 했습니다.

---

## 🎯 구현된 주요 기능

### 1. 환경변수 암호화 시스템

#### 1.1 암호화 라이브러리 (`src/lib/envEncryption.js`)

**구현 내용:**
- **암호화 알고리즘**: AES-256-GCM (Advanced Encryption Standard 256-bit Galois/Counter Mode)
- **키 파생**: PBKDF2 (Password-Based Key Derivation Function 2) with SHA-512
- **보안 파라미터**:
  - IV (Initialization Vector): 16 bytes (128 bits)
  - Salt: 64 bytes (512 bits)
  - Authentication Tag: 16 bytes (128 bits)
  - Key Length: 32 bytes (256 bits)
  - PBKDF2 Iterations: 100,000

**주요 함수:**
- `encryptValue(plaintext)`: 평문을 암호화하여 hex 문자열로 반환
- `decryptValue(ciphertext)`: 암호화된 문자열을 복호화
- `loadEncryptedEnv()`: 암호화된 파일에서 환경변수 로드 및 복호화
- `saveEncryptedEnv(envVars)`: 환경변수를 암호화하여 파일에 저장
- `loadEncryptedEnvToProcess(overwrite)`: 암호화된 환경변수를 `process.env`에 로드

**보안 특징:**
- 각 값마다 고유한 salt와 IV 사용 (동일한 값도 다른 암호문 생성)
- Authentication Tag로 무결성 검증
- 개발 환경에서는 고정된 개발용 키 사용 (일관성 유지)
- 프로덕션 환경에서는 `ENCRYPTION_KEY` 환경변수 필수

#### 1.2 저장 형식

**파일 위치**: `config/env.encrypted.json`

**저장 형식**:
```json
{
  "FMP_API_KEY": "salt:iv:tag:encrypted",
  "SUPABASE_URL": "salt:iv:tag:encrypted",
  ...
}
```

각 암호화된 값은 `salt:iv:tag:encrypted` 형식으로 저장됩니다.

---

### 2. Control Panel 환경변수 관리 UI

#### 2.1 환경변수 관리 섹션 추가

**위치**: `src/api/endpoints/control.js` - "🔐 환경변수 및 API 키 관리" 섹션

**기능:**
1. **환경변수 목록 표시**
   - 현재 저장된 모든 환경변수 표시
   - 민감한 키(KEY, SECRET, PASSWORD 포함)는 자동으로 마스킹
   - 암호화된 값은 "암호화됨 (새 값 입력 시 교체)" 표시

2. **환경변수 추가**
   - 키와 값을 입력하여 새 환경변수 추가
   - 추가 즉시 UI에 반영

3. **환경변수 수정**
   - 입력 필드에서 값 수정 가능
   - 민감한 값은 password 타입 입력 필드 사용

4. **환경변수 삭제**
   - 각 환경변수 옆 삭제 버튼으로 제거

5. **값 복사 (Reveal 기능)**
   - 민감한 환경변수에 대해 눈 모양 버튼 제공
   - 클릭 시 서버에서 복호화된 값을 가져와 클립보드에 복사
   - API 키 인증 필요

6. **환경변수 저장**
   - 모든 변경사항을 암호화하여 `config/env.encrypted.json`에 저장
   - 저장 후 서버 재시작 필요

#### 2.2 API 엔드포인트

**`POST /control/saveEnvVars`**
- 환경변수를 암호화하여 저장
- 요청 본문: `{ envVars: { KEY: "value", ... } }`
- 인증: API 키 필요

**`GET /control/getEnvVar`**
- 단일 환경변수의 복호화된 값 반환
- 쿼리 파라미터: `key=ENV_VAR_NAME`
- 인증: API 키 필요
- 용도: Reveal 기능에서 사용

---

### 3. 애플리케이션 시작 시 자동 로드

#### 3.1 환경변수 로드 순서 (`src/index.js`)

**변경 전:**
```javascript
import 'dotenv/config';
// dotenv만 로드
```

**변경 후:**
```javascript
import 'dotenv/config';
import { loadEncryptedEnvToProcess } from './lib/envEncryption.js';

(async () => {
  try {
    // overwrite=true로 설정하여 암호화된 값이 우선 적용
    const loadedVars = await loadEncryptedEnvToProcess(true);
    if (Object.keys(loadedVars).length > 0) {
      console.log(`[Startup] Loaded ${Object.keys(loadedVars).length} encrypted environment variables`);
    }
  } catch (error) {
    console.warn('[Startup] Failed to load encrypted environment variables:', error.message);
  }
  // ... 나머지 초기화 코드
})();
```

**로드 우선순위:**
1. `dotenv/config`로 `.env` 파일 로드 (기본값)
2. `loadEncryptedEnvToProcess(true)`로 암호화된 값 로드 및 덮어쓰기 (우선순위 높음)

이렇게 하면 암호화된 환경변수가 `.env` 파일의 값보다 우선적으로 적용됩니다.

---

### 4. Supabase 조건부 초기화

#### 4.1 변경 내용 (`src/config/supabase.js`)

**변경 전:**
- Supabase 자격증명이 없으면 `process.exit(1)`로 종료

**변경 후:**
- `USE_DATABASE` 환경변수 확인
- `USE_DATABASE=false`이면 Supabase 초기화 스킵
- 자격증명이 없어도 경고만 출력하고 계속 진행

**코드:**
```javascript
if (process.env.USE_DATABASE === 'false') {
  console.log('[Supabase] USE_DATABASE=false, skipping initialization');
  export const supabase = null;
} else {
  // Supabase 초기화 로직
  // 자격증명이 없으면 경고만 출력
}
```

#### 4.2 데이터베이스 의존성 제거

**변경된 파일:**
- `src/services/dbManager.js`: `supabase` null 체크 추가
- `src/services/tradingDayService.js`: `supabase` null 체크 추가

이제 데이터베이스 없이도 애플리케이션이 실행 가능합니다.

---

### 5. 보안 강화

#### 5.1 하드코딩된 키 제거

**문제:**
- `scripts/initEncryptedEnv.js` 파일에 실제 API 키가 하드코딩되어 있었음
- `.gitignore`에 포함되지 않아 GitHub에 노출될 위험

**해결:**
1. `scripts/initEncryptedEnv.js` 삭제
2. `scripts/initEncryptedEnv.example.js` 생성 (플레이스홀더만 포함)
3. `.gitignore`에 `scripts/initEncryptedEnv.js` 추가

**결과:**
- 실제 키는 Control Panel을 통해서만 관리
- GitHub에 노출될 위험 제거

#### 5.2 ENCRYPTION_KEY 관리

**개발 환경:**
- `ENCRYPTION_KEY`가 없으면 고정된 개발용 키 사용
- 경고 메시지는 한 번만 출력 (중복 방지)

**프로덕션 환경:**
- `ENCRYPTION_KEY` 환경변수 필수
- `.env` 파일 또는 시스템 환경변수로 설정

---

## 🐛 발생한 오류 및 해결 방안

### 오류 1: `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv'`

**발생 위치**: 서버 시작 시

**원인**: 
- `dotenv` 패키지가 설치되지 않음

**해결:**
```bash
npm install
```

**결과**: 모든 의존성 패키지 설치 완료

---

### 오류 2: `❌ Supabase credentials required! Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file`

**발생 위치**: 서버 시작 시 (`src/config/supabase.js`)

**원인**:
- Supabase 자격증명이 없을 때 `process.exit(1)`로 종료
- Control Panel에서 환경변수를 관리하려고 했지만 서버가 시작되지 않음

**해결:**
1. `src/config/supabase.js` 수정:
   - `USE_DATABASE=false`일 때 초기화 스킵
   - 자격증명이 없어도 경고만 출력하고 계속 진행

2. `src/services/dbManager.js`, `src/services/tradingDayService.js` 수정:
   - `supabase` null 체크 추가
   - 데이터베이스 없이도 동작하도록 수정

**결과**: 
- 데이터베이스 없이도 서버 실행 가능
- Control Panel에서 환경변수 설정 후 서버 재시작하면 Supabase 초기화 가능

---

### 오류 3: `Control Panel에 접근하려면 API 키가 필요합니다.` (Unauthorized)

**발생 위치**: Control Panel 접근 시 (`http://localhost:3000/control?api_key=...`)

**원인**:
- `ENCRYPTION_KEY`가 설정되지 않아 매번 다른 키로 암호화/복호화 시도
- 암호화된 환경변수 복호화 실패
- `CONTROL_API_KEY`를 읽을 수 없어 인증 실패

**해결:**
1. `src/lib/envEncryption.js`의 `getMasterKey()` 함수 수정:
   ```javascript
   // 변경 전: 매번 랜덤 키 생성
   // 변경 후: 고정된 개발용 키 사용 (ENCRYPTION_KEY가 없을 때)
   masterKey = 'dev-encryption-key-for-local-development-only-do-not-use-in-production-2024';
   ```

2. `src/index.js`에서 환경변수 로드 순서 변경:
   ```javascript
   // dotenv 먼저 로드
   import 'dotenv/config';
   // 암호화된 환경변수를 나중에 로드하여 덮어쓰기
   await loadEncryptedEnvToProcess(true);
   ```

**결과**:
- 개발 환경에서 일관된 암호화/복호화 가능
- Control Panel 접근 가능

---

### 오류 4: `[EnvEncryption] 복호화 실패: Unsupported state or unable to authenticate data`

**발생 위치**: 서버 시작 시, 환경변수 로드 시

**원인**:
- 오류 3과 동일: `ENCRYPTION_KEY`가 일관되지 않아 복호화 실패

**해결**:
- 오류 3 해결과 동일
- 추가로: 기존 암호화된 파일을 새 키로 재암호화

**결과**:
- 복호화 성공
- 환경변수 정상 로드

---

### 오류 5: 중복된 경고 메시지 출력

**발생 위치**: 서버 시작 시, 환경변수 로드 시

**원인**:
- `getMasterKey()` 함수가 호출될 때마다 경고 메시지 출력
- 여러 환경변수를 로드할 때 반복 출력

**해결:**
```javascript
// src/lib/envEncryption.js
let encryptionKeyWarningShown = false;

function getMasterKey() {
  let masterKey = process.env.ENCRYPTION_KEY;
  
  if (!masterKey) {
    if (!encryptionKeyWarningShown) {
      console.warn('[EnvEncryption] ENCRYPTION_KEY가 설정되지 않았습니다...');
      encryptionKeyWarningShown = true;
    }
    masterKey = 'dev-encryption-key-for-local-development-only-do-not-use-in-production-2024';
  }
  
  return masterKey;
}
```

**결과**:
- 경고 메시지가 한 번만 출력됨

---

### 오류 6: Control Panel UI 기능 오류

#### 6.1 눈 모양 버튼 (Reveal) 작동 안 함

**발생 위치**: Control Panel - 환경변수 관리 섹션

**원인**:
- `onclick="revealEnvVar('KEY')"` 형식의 인라인 이벤트 핸들러 사용
- 키 이름에 특수 문자(`'`, `"`)가 포함되면 JavaScript 구문 오류 발생
- 함수가 전역 스코프에 제대로 노출되지 않음

**해결:**
1. 인라인 `onclick` 제거, `data-action`과 `data-env-key` 속성 사용:
   ```html
   <!-- 변경 전 -->
   <button onclick="revealEnvVar('KEY')">👁️</button>
   
   <!-- 변경 후 -->
   <button data-action="reveal" data-env-key="KEY">👁️</button>
   ```

2. 이벤트 위임 사용:
   ```javascript
   document.addEventListener('click', function(e) {
     var target = e.target.closest('[data-action]');
     if (!target) return;
     
     var action = target.getAttribute('data-action');
     var key = target.getAttribute('data-env-key');
     
     if (action === 'reveal') {
       revealEnvVar(key);
     }
   });
   ```

3. HTML 이스케이프 처리:
   ```javascript
   const escapedKey = key.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
   ```

**결과**:
- 특수 문자가 포함된 키 이름도 안전하게 처리
- Reveal 기능 정상 작동

#### 6.2 추가 버튼 작동 안 함

**발생 위치**: Control Panel - 환경변수 관리 섹션

**원인**:
- `addNewEnvVar` 함수가 전역 스코프에 노출되지 않음
- 입력 검증 로직 누락

**해결:**
1. 함수를 `window` 객체에 명시적으로 할당:
   ```javascript
   window.addNewEnvVar = addNewEnvVar;
   ```

2. 입력 검증 추가:
   ```javascript
   function addNewEnvVar() {
     var keyInput = document.getElementById('newEnvKey');
     var valueInput = document.getElementById('newEnvValue');
     
     if (!keyInput || !valueInput) {
       showToast('입력 필드를 찾을 수 없습니다', 'error');
       return;
     }
     
     var key = keyInput.value.trim();
     var value = valueInput.value.trim();
     
     if (!key || !value) {
       showToast('키와 값을 모두 입력하세요', 'error');
       return;
     }
     // ... 나머지 로직
   }
   ```

**결과**:
- 추가 버튼 정상 작동
- 입력 검증으로 오류 방지

#### 6.3 저장 버튼 작동 안 함

**발생 위치**: Control Panel - 환경변수 관리 섹션

**원인**:
- `saveEnvVars` 함수가 전역 스코프에 노출되지 않음
- API 키가 fetch 요청에 포함되지 않음

**해결:**
1. 함수를 `window` 객체에 명시적으로 할당:
   ```javascript
   window.saveEnvVars = saveEnvVars;
   ```

2. API 키를 fetch 요청에 포함:
   ```javascript
   function saveEnvVars() {
     // ... 환경변수 수집 로직
     
     var urlParams = new URLSearchParams(window.location.search);
     var apiKey = urlParams.get('api_key');
     
     fetch('/control/saveEnvVars', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         envVars: envVars,
         api_key: apiKey  // API 키 포함
       })
     })
     // ...
   }
   ```

**결과**:
- 저장 버튼 정상 작동
- API 키 인증 성공

---

### 오류 7: JavaScript 구문 오류 (`Unexpected string`)

**발생 위치**: Control Panel 페이지 로드 시

**원인**:
- HTML 생성 시 문자열 이스케이프 처리 부족
- 키 이름에 특수 문자(`'`, `"`)가 포함되면 JavaScript 문자열 리터럴 구문 오류

**해결:**
1. `onclick` 속성 제거, `data-*` 속성 사용 (오류 6.1과 동일)
2. HTML 이스케이프 처리 강화:
   ```javascript
   const escapedKey = key.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
   ```

**결과**:
- 구문 오류 해결
- 모든 키 이름 안전하게 처리

---

### 오류 8: `revealEnvVar is not defined`

**발생 위치**: Control Panel - Reveal 버튼 클릭 시

**원인**:
- 이벤트 위임이 함수 정의 전에 설정됨
- 함수가 아직 정의되지 않은 상태에서 호출 시도

**해결:**
1. 이벤트 위임을 함수 정의 직후에 설정:
   ```javascript
   // 함수 정의
   function revealEnvVar(key) { ... }
   window.revealEnvVar = revealEnvVar;
   
   // 함수 정의 직후에 이벤트 위임 설정
   document.addEventListener('click', function(e) {
     // ...
   });
   ```

**결과**:
- 함수가 정의된 후에 이벤트 리스너 설정
- `revealEnvVar is not defined` 오류 해결

---

## 📁 변경된 파일 목록

### 새로 생성된 파일

1. **`src/lib/envEncryption.js`**
   - 환경변수 암호화/복호화 유틸리티
   - AES-256-GCM 암호화 구현

2. **`docs/ENCRYPTION_KEY_SETUP.md`**
   - `ENCRYPTION_KEY` 설정 가이드
   - 로컬/프로덕션 환경별 설정 방법

3. **`scripts/initEncryptedEnv.example.js`**
   - 환경변수 초기화 예시 스크립트
   - 플레이스홀더만 포함 (실제 키 없음)

4. **`README_ENCRYPTION.md`**
   - 환경변수 암호화 시스템 개요
   - 사용 방법 안내

### 수정된 파일

1. **`src/api/endpoints/control.js`**
   - 환경변수 관리 UI 추가
   - `saveEnvVarsHandler`, `getEnvVarHandler` 엔드포인트 추가
   - `generateEnvVarsHtml` 함수 추가
   - 이벤트 위임으로 UI 이벤트 처리 개선

2. **`src/index.js`**
   - 환경변수 자동 로드 로직 추가
   - `getEnvVarHandler` 라우트 추가

3. **`src/config/supabase.js`**
   - 조건부 초기화 로직 추가
   - `USE_DATABASE` 환경변수 지원

4. **`src/services/dbManager.js`**
   - `supabase` null 체크 추가

5. **`src/services/tradingDayService.js`**
   - `supabase` null 체크 추가

6. **`.gitignore`**
   - `scripts/initEncryptedEnv.js` 추가

### 삭제된 파일

1. **`scripts/initEncryptedEnv.js`**
   - 실제 API 키가 하드코딩되어 있었음
   - 보안상 삭제 (`.gitignore`에 추가하여 재생성 방지)

---

## 🔒 보안 고려사항

### 1. 암호화 강도

- **AES-256-GCM**: 업계 표준 강력한 암호화
- **PBKDF2 (100,000 iterations)**: 키 파생 함수로 무차별 대입 공격 방지
- **고유 Salt/IV**: 각 값마다 다른 암호문 생성 (패턴 분석 불가)

### 2. 키 관리

- **개발 환경**: 고정된 개발용 키 사용 (일관성)
- **프로덕션 환경**: `ENCRYPTION_KEY` 환경변수 필수
- **키 노출 방지**: `.env` 파일은 `.gitignore`에 포함

### 3. 파일 보안

- **암호화된 파일**: `config/env.encrypted.json`은 GitHub에 커밋 가능 (암호화되어 있음)
- **실제 키 파일**: `scripts/initEncryptedEnv.js`는 `.gitignore`에 포함

### 4. API 인증

- Control Panel의 모든 환경변수 관련 작업은 API 키 인증 필요
- Reveal 기능도 서버에서 복호화하여 전달 (클라이언트에서 복호화하지 않음)

---

## 📝 사용 방법

### 1. 초기 설정

#### 방법 A: Control Panel 사용 (권장)

1. 서버 시작: `npm run dev`
2. Control Panel 접속: `http://localhost:3000/control?api_key=YOUR_API_KEY`
3. "🔐 환경변수 및 API 키 관리" 섹션에서:
   - "➕ 추가" 버튼으로 환경변수 추가
   - "💾 환경변수 저장" 버튼으로 암호화 저장

#### 방법 B: 스크립트 사용

1. `scripts/initEncryptedEnv.example.js`를 복사하여 `scripts/initEncryptedEnv.js` 생성
2. 실제 값으로 수정
3. 실행: `node scripts/initEncryptedEnv.js`

### 2. 환경변수 추가/수정

1. Control Panel 접속
2. "🔐 환경변수 및 API 키 관리" 섹션에서 수정
3. "💾 환경변수 저장" 클릭
4. 서버 재시작

### 3. 환경변수 확인 (Reveal)

1. Control Panel 접속
2. 민감한 환경변수 옆의 👀 버튼 클릭
3. 클립보드에 복사됨 (10초간 표시)

### 4. ENCRYPTION_KEY 설정

**로컬 개발 (선택사항):**
- `.env` 파일에 추가: `ENCRYPTION_KEY=your-key-here`

**프로덕션 (필수):**
- 환경변수로 설정 (Render.com, Heroku 등)
- 자세한 방법: `docs/ENCRYPTION_KEY_SETUP.md` 참조

---

## ✅ 테스트 완료 사항

- [x] 환경변수 암호화/복호화 정상 작동
- [x] Control Panel에서 환경변수 추가/수정/삭제
- [x] Reveal 기능 (값 복사)
- [x] 서버 시작 시 자동 로드
- [x] 암호화된 값이 `.env` 값보다 우선 적용
- [x] 데이터베이스 없이도 서버 실행 가능
- [x] 특수 문자가 포함된 키 이름 처리
- [x] API 키 인증 정상 작동
- [x] 하드코딩된 키 제거 및 보안 강화

---

## 🚀 향후 개선 사항

1. **환경변수 검증**: 키 이름 형식 검증 (대문자, 언더스코어 등)
2. **백업 기능**: 암호화된 환경변수 백업/복원
3. **버전 관리**: 환경변수 변경 이력 추적
4. **일괄 가져오기**: `.env` 파일에서 일괄 가져오기
5. **환경별 관리**: 개발/스테이징/프로덕션 환경별 분리

---

## 📚 참고 문서

- `docs/ENCRYPTION_KEY_SETUP.md`: ENCRYPTION_KEY 설정 가이드
- `README_ENCRYPTION.md`: 환경변수 암호화 시스템 개요
- `scripts/initEncryptedEnv.example.js`: 초기화 스크립트 예시

---

**작성일**: 2024년
**작성자**: AI Assistant
**버전**: 1.0

