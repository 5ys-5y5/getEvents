/**
 * 환경변수 초기화 스크립트 예시
 * 
 * 사용 방법:
 * 1. 이 파일을 복사하여 scripts/initEncryptedEnv.js로 저장
 * 2. 실제 값으로 수정
 * 3. node scripts/initEncryptedEnv.js 실행
 * 
 * ⚠️ 주의: initEncryptedEnv.js는 .gitignore에 포함되어 있어 Git에 커밋되지 않습니다.
 */

import { saveEncryptedEnv } from '../src/lib/envEncryption.js';

// 환경변수 설정 (실제 값으로 수정하세요)
const envVars = {
  // FMP API 키
  FMP_API_KEY: 'your-fmp-api-key-here',
  
  // Supabase 설정
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-supabase-anon-key-here',
  
  // Control Panel API 키 (선택사항)
  CONTROL_API_KEY: 'your-control-panel-api-key-here',
  
  // 데이터베이스 사용 여부 (선택사항)
  // USE_DATABASE: 'false',  // 데이터베이스 없이 실행하려면 주석 해제
};

async function init() {
  try {
    console.log('환경변수 암호화 중...');
    await saveEncryptedEnv(envVars);
    console.log('✅ 환경변수가 암호화되어 저장되었습니다.');
    console.log('   위치: config/env.encrypted.json');
    console.log('');
    console.log('서버를 재시작하면 암호화된 환경변수가 자동으로 로드됩니다.');
    console.log('npm run dev');
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

init();

