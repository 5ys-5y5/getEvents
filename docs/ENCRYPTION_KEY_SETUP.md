# ENCRYPTION_KEY 설정 가이드

환경변수 암호화 시스템에서 사용하는 `ENCRYPTION_KEY` 설정 방법을 안내합니다.

## 개요

- **암호화 알고리즘**: AES-256-GCM
- **키 파생**: PBKDF2 with SHA-512 (100,000 iterations)
- **암호화된 파일 위치**: `config/env.encrypted.json`

## 환경별 설정

### 로컬 개발 환경 (선택사항)

개발 환경에서는 `ENCRYPTION_KEY`를 설정하지 않아도 됩니다. 
설정하지 않으면 고정된 개발용 키가 자동으로 사용됩니다.

```bash
# .env 파일 (선택사항)
ENCRYPTION_KEY=your-development-key-here
```

> ⚠️ **주의**: 개발용 키는 프로덕션에서 절대 사용하지 마세요!

### 프로덕션 환경 (필수)

프로덕션 환경에서는 반드시 강력한 `ENCRYPTION_KEY`를 설정해야 합니다.

#### 방법 1: 환경변수로 설정 (권장)

**Render.com:**
1. Dashboard > Environment > Environment Variables
2. `ENCRYPTION_KEY` 추가
3. 강력한 키 값 입력

**Heroku:**
```bash
heroku config:set ENCRYPTION_KEY="your-strong-production-key"
```

**Docker:**
```bash
docker run -e ENCRYPTION_KEY="your-strong-production-key" your-image
```

#### 방법 2: .env 파일 (로컬 전용)

```bash
# .env (절대 Git에 커밋하지 마세요!)
ENCRYPTION_KEY=your-strong-production-key
```

## 강력한 키 생성 방법

### Node.js 사용

```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(64).toString('hex'));
```

### OpenSSL 사용

```bash
openssl rand -hex 64
```

### 온라인 도구

- https://randomkeygen.com/
- 최소 64자 이상의 랜덤 문자열 권장

## 키 요구사항

- **최소 길이**: 32자 이상 권장
- **권장 길이**: 64자 이상
- **문자 구성**: 영문 대소문자, 숫자, 특수문자 혼합
- **유니크성**: 각 환경(개발/스테이징/프로덕션)마다 다른 키 사용

## 키 변경 시 주의사항

1. **기존 암호화된 데이터 백업**
   ```bash
   cp config/env.encrypted.json config/env.encrypted.json.backup
   ```

2. **새 키로 재암호화**
   - Control Panel에서 모든 환경변수를 다시 저장
   - 또는 새 키로 초기화 스크립트 실행

3. **서버 재시작**
   ```bash
   npm run dev
   ```

## 트러블슈팅

### 복호화 실패 오류

```
[EnvEncryption] 복호화 실패: Unsupported state or unable to authenticate data
```

**원인**: 암호화할 때 사용한 키와 복호화할 때 사용한 키가 다름

**해결**:
1. `ENCRYPTION_KEY` 환경변수 확인
2. 키가 변경되었다면 기존 암호화 파일 삭제 후 재생성
   ```bash
   rm config/env.encrypted.json
   ```
3. Control Panel에서 환경변수 다시 설정

### 개발용 키 경고 메시지

```
[EnvEncryption] ⚠️ ENCRYPTION_KEY가 설정되지 않았습니다. 개발용 키를 사용합니다.
```

**설명**: 정상적인 경고입니다. 개발 환경에서는 무시해도 됩니다.

**프로덕션에서 이 메시지가 보이면**: 즉시 `ENCRYPTION_KEY` 환경변수를 설정하세요!

## 보안 권장사항

1. **키를 코드에 하드코딩하지 마세요**
2. **키를 Git에 커밋하지 마세요**
3. **키를 로그에 출력하지 마세요**
4. **정기적으로 키를 교체하세요** (분기별 권장)
5. **키 접근 권한을 최소화하세요**

## 관련 파일

- `src/lib/envEncryption.js` - 암호화/복호화 로직
- `config/env.encrypted.json` - 암호화된 환경변수 저장 파일
- `src/api/endpoints/control.js` - Control Panel UI

