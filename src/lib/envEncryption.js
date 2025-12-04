/**
 * 환경변수 암호화 시스템
 * 
 * 암호화 알고리즘: AES-256-GCM
 * 키 파생: PBKDF2 with SHA-512
 * 
 * 보안 파라미터:
 * - IV: 16 bytes (128 bits)
 * - Salt: 64 bytes (512 bits)
 * - Auth Tag: 16 bytes (128 bits)
 * - Key Length: 32 bytes (256 bits)
 * - PBKDF2 Iterations: 100,000
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 암호화된 환경변수 저장 경로
const ENCRYPTED_ENV_PATH = path.join(__dirname, '../../config/env.encrypted.json');

// 암호화 파라미터
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// 경고 메시지 중복 방지
let encryptionKeyWarningShown = false;

/**
 * 마스터 키 획득
 * - 프로덕션: ENCRYPTION_KEY 환경변수 필수
 * - 개발: 고정된 개발용 키 사용
 */
function getMasterKey() {
  let masterKey = process.env.ENCRYPTION_KEY;
  
  if (!masterKey) {
    if (!encryptionKeyWarningShown) {
      console.warn('[EnvEncryption] ⚠️ ENCRYPTION_KEY가 설정되지 않았습니다. 개발용 키를 사용합니다.');
      console.warn('[EnvEncryption] 프로덕션 환경에서는 반드시 ENCRYPTION_KEY를 설정하세요.');
      encryptionKeyWarningShown = true;
    }
    // 개발 환경용 고정 키 (일관성 유지)
    masterKey = 'dev-encryption-key-for-local-development-only-do-not-use-in-production-2024';
  }
  
  return masterKey;
}

/**
 * 키 파생 함수 (PBKDF2)
 * @param {string} password - 마스터 키
 * @param {Buffer} salt - 솔트
 * @returns {Buffer} - 파생된 키
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * 값 암호화
 * @param {string} plaintext - 평문
 * @returns {string} - 암호화된 문자열 (salt:iv:tag:encrypted)
 */
export function encryptValue(plaintext) {
  const masterKey = getMasterKey();
  
  // 랜덤 salt와 IV 생성
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // 키 파생
  const key = deriveKey(masterKey, salt);
  
  // 암호화
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Authentication Tag
  const tag = cipher.getAuthTag();
  
  // 형식: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 값 복호화
 * @param {string} ciphertext - 암호화된 문자열 (salt:iv:tag:encrypted)
 * @returns {string} - 복호화된 평문
 */
export function decryptValue(ciphertext) {
  const masterKey = getMasterKey();
  
  // 파싱
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('잘못된 암호화 형식입니다.');
  }
  
  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];
  
  // 키 파생
  const key = deriveKey(masterKey, salt);
  
  // 복호화
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 암호화된 환경변수 파일 로드
 * @returns {Promise<Object>} - 복호화된 환경변수 객체
 */
export async function loadEncryptedEnv() {
  try {
    const content = await fs.readFile(ENCRYPTED_ENV_PATH, 'utf-8');
    const encryptedVars = JSON.parse(content);
    
    const decryptedVars = {};
    
    for (const [key, encryptedValue] of Object.entries(encryptedVars)) {
      try {
        decryptedVars[key] = decryptValue(encryptedValue);
      } catch (error) {
        console.error(`[EnvEncryption] 복호화 실패 (${key}): ${error.message}`);
      }
    }
    
    return decryptedVars;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 파일이 없으면 빈 객체 반환
      return {};
    }
    throw error;
  }
}

/**
 * 환경변수를 암호화하여 파일에 저장
 * @param {Object} envVars - 환경변수 객체 { KEY: "value", ... }
 * @returns {Promise<void>}
 */
export async function saveEncryptedEnv(envVars) {
  const encryptedVars = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value && value.trim()) {
      encryptedVars[key] = encryptValue(value);
    }
  }
  
  // config 디렉토리가 없으면 생성
  const configDir = path.dirname(ENCRYPTED_ENV_PATH);
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
  
  await fs.writeFile(ENCRYPTED_ENV_PATH, JSON.stringify(encryptedVars, null, 2), 'utf-8');
  console.log(`[EnvEncryption] ${Object.keys(encryptedVars).length}개의 환경변수가 암호화되어 저장되었습니다.`);
}

/**
 * 암호화된 환경변수를 process.env에 로드
 * @param {boolean} overwrite - 기존 값 덮어쓰기 여부
 * @returns {Promise<Object>} - 로드된 환경변수 객체
 */
export async function loadEncryptedEnvToProcess(overwrite = true) {
  const decryptedVars = await loadEncryptedEnv();
  
  for (const [key, value] of Object.entries(decryptedVars)) {
    if (overwrite || !process.env[key]) {
      process.env[key] = value;
    }
  }
  
  return decryptedVars;
}

/**
 * 단일 환경변수 복호화 (API용)
 * @param {string} key - 환경변수 키
 * @returns {Promise<string|null>} - 복호화된 값 또는 null
 */
export async function getDecryptedEnvVar(key) {
  try {
    const content = await fs.readFile(ENCRYPTED_ENV_PATH, 'utf-8');
    const encryptedVars = JSON.parse(content);
    
    if (encryptedVars[key]) {
      return decryptValue(encryptedVars[key]);
    }
    return null;
  } catch (error) {
    console.error(`[EnvEncryption] 환경변수 조회 실패 (${key}): ${error.message}`);
    return null;
  }
}

/**
 * 암호화된 환경변수 키 목록 조회 (값은 마스킹)
 * @returns {Promise<Object>} - { key: "마스킹된 값" } 형태
 */
export async function getEncryptedEnvKeys() {
  try {
    const content = await fs.readFile(ENCRYPTED_ENV_PATH, 'utf-8');
    const encryptedVars = JSON.parse(content);
    
    const maskedVars = {};
    for (const key of Object.keys(encryptedVars)) {
      // 민감한 키는 마스킹
      const isSensitive = /KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL/i.test(key);
      maskedVars[key] = isSensitive ? '********' : '[암호화됨]';
    }
    
    return maskedVars;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export default {
  encryptValue,
  decryptValue,
  loadEncryptedEnv,
  saveEncryptedEnv,
  loadEncryptedEnvToProcess,
  getDecryptedEnvVar,
  getEncryptedEnvKeys
};

