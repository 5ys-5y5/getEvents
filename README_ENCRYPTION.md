# 환경변수 암호화 시스템

이 프로젝트는 민감한 환경변수(API 키, 데이터베이스 자격증명 등)를 안전하게 관리하기 위한 암호화 시스템을 제공합니다.

## 주요 기능

- **AES-256-GCM 암호화**: 업계 표준 강력한 암호화
- **Control Panel UI**: 웹 인터페이스로 환경변수 관리
- **자동 로드**: 서버 시작 시 암호화된 환경변수 자동 로드
- **마스킹**: 민감한 값 자동 마스킹

## 빠른 시작

### 1. 서버 시작

```bash
npm run dev
```

### 2. Control Panel 접속

```
http://localhost:3000/control?api_key=YOUR_API_KEY
```

> 최초 실행 시 `.env` 파일의 `CONTROL_API_KEY` 또는 `FMP_API_KEY` 사용

### 3. 환경변수 추가

1. "🔐 환경변수 및 API 키 관리" 섹션으로 이동
2. 키와 값 입력 후 "➕ 추가" 클릭
3. "💾 환경변수 저장" 클릭
4. 서버 재시작

## 환경변수 우선순위

1. **암호화된 환경변수** (`config/env.encrypted.json`) - 최우선
2. **`.env` 파일** - 암호화된 값이 없을 때 사용

## 파일 구조

```
├── config/
│   └── env.encrypted.json    # 암호화된 환경변수 (자동 생성)
├── src/
│   └── lib/
│       └── envEncryption.js  # 암호화 라이브러리
├── scripts/
│   └── initEncryptedEnv.example.js  # 초기화 스크립트 예시
└── docs/
    └── ENCRYPTION_KEY_SETUP.md      # ENCRYPTION_KEY 설정 가이드
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/control` | GET | Control Panel 페이지 |
| `/control/saveEnvVars` | POST | 환경변수 저장 |
| `/control/getEnvVar` | GET | 단일 환경변수 조회 (복호화) |

## 보안 고려사항

1. **ENCRYPTION_KEY**: 프로덕션에서 반드시 설정
2. **API 키 인증**: Control Panel 접근 시 필요
3. **암호화 파일**: Git에 커밋해도 안전 (암호화됨)
4. **실제 키 파일**: `.gitignore`에 포함

## 데이터베이스 없이 실행

Supabase 자격증명 없이도 서버를 실행할 수 있습니다:

```bash
# .env 파일에 추가
USE_DATABASE=false
```

또는 Control Panel에서 `USE_DATABASE=false` 환경변수 추가

## 트러블슈팅

### "Access Denied" 오류

- API 키가 올바른지 확인
- URL에 `?api_key=YOUR_KEY` 포함 확인

### 복호화 실패

- `ENCRYPTION_KEY`가 변경되었는지 확인
- 필요시 `config/env.encrypted.json` 삭제 후 재설정

### 서버 시작 실패

- `.env` 파일에 최소한 `CONTROL_API_KEY` 설정
- 또는 `USE_DATABASE=false` 설정

## 추가 문서

- [ENCRYPTION_KEY 설정 가이드](docs/ENCRYPTION_KEY_SETUP.md)
- [환경변수 암호화 시스템 변경 사항](docs/CHANGELOG_환경변수_암호화_시스템.md)

