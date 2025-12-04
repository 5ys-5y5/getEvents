/**
 * Admin Authentication Endpoints
 * Handles login, signup, and logout
 */

import { supabase } from '../../config/supabase.js';
import bcrypt from 'bcrypt';
import {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionTokenFromRequest,
  updateLastLogin
} from '../../lib/sessionManager.js';

const BCRYPT_ROUNDS = 10;

// ==================== LOGIN PAGE ====================
export function loginPage(req, res) {
  const error = req.query.error || '';
  const message = req.query.message || '';

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - Financial API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #999999;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-container {
      background: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 12px;
      padding: 48px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .login-header h1 {
      font-size: 1.75rem;
      color: #111111;
      margin-bottom: 8px;
    }
    .login-header p {
      color: #666666;
      font-size: 0.95rem;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-weight: 500;
      color: #111111;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #dddddd;
      border-radius: 6px;
      font-size: 1rem;
      background: #fafafa;
      transition: all 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #0066cc;
      background: #ffffff;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #0052a3;
    }
    .btn:active {
      transform: translateY(1px);
    }
    .error-message {
      background: #fee;
      border: 1px solid #fcc;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .success-message {
      background: #efe;
      border: 1px solid #cfc;
      color: #2e7d32;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .divider {
      text-align: center;
      margin: 24px 0;
      color: #999999;
      font-size: 0.9rem;
    }
    .signup-link {
      text-align: center;
      margin-top: 20px;
    }
    .signup-link a {
      color: #0066cc;
      text-decoration: none;
      font-weight: 500;
    }
    .signup-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="login-header">
      <h1>📊 Admin Login</h1>
      <p>Financial Event API 관리자 로그인</p>
    </div>

    ${error ? `<div class="error-message">❌ ${error}</div>` : ''}
    ${message ? `<div class="success-message">✅ ${message}</div>` : ''}

    <form action="/auth/login" method="POST">
      <div class="form-group">
        <label for="username">아이디</label>
        <input type="text" id="username" name="username" required autocomplete="username" autofocus>
      </div>

      <div class="form-group">
        <label for="password">비밀번호</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>

      <button type="submit" class="btn">로그인</button>
    </form>

    <div class="divider">또는</div>

    <div class="signup-link">
      <a href="/auth/signup">계정이 없으신가요? 회원가입</a>
    </div>
  </div>
</body>
</html>
  `;

  res.send(html);
}

// ==================== SIGNUP PAGE ====================
export function signupPage(req, res) {
  const error = req.query.error || '';

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Signup - Financial API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #999999;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .signup-container {
      background: #ffffff;
      border: 1px solid #dddddd;
      border-radius: 12px;
      padding: 48px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .signup-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .signup-header h1 {
      font-size: 1.75rem;
      color: #111111;
      margin-bottom: 8px;
    }
    .signup-header p {
      color: #666666;
      font-size: 0.95rem;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      font-weight: 500;
      color: #111111;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #dddddd;
      border-radius: 6px;
      font-size: 1rem;
      background: #fafafa;
      transition: all 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #0066cc;
      background: #ffffff;
    }
    .form-help {
      font-size: 0.85rem;
      color: #666666;
      margin-top: 4px;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #0052a3;
    }
    .error-message {
      background: #fee;
      border: 1px solid #fcc;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .divider {
      text-align: center;
      margin: 24px 0;
      color: #999999;
      font-size: 0.9rem;
    }
    .login-link {
      text-align: center;
      margin-top: 20px;
    }
    .login-link a {
      color: #0066cc;
      text-decoration: none;
      font-weight: 500;
    }
    .login-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="signup-container">
    <div class="signup-header">
      <h1>📝 Admin Signup</h1>
      <p>Financial Event API 관리자 회원가입</p>
    </div>

    ${error ? `<div class="error-message">❌ ${error}</div>` : ''}

    <form action="/auth/signup" method="POST">
      <div class="form-group">
        <label for="username">아이디</label>
        <input type="text" id="username" name="username" required autocomplete="username" pattern="[a-zA-Z0-9_-]{3,}" autofocus>
        <div class="form-help">3자 이상, 영문/숫자/언더스코어/하이픈만 사용 가능</div>
      </div>

      <div class="form-group">
        <label for="email">이메일 (선택사항)</label>
        <input type="email" id="email" name="email" autocomplete="email">
      </div>

      <div class="form-group">
        <label for="password">비밀번호</label>
        <input type="password" id="password" name="password" required autocomplete="new-password" minlength="6">
        <div class="form-help">최소 6자 이상</div>
      </div>

      <div class="form-group">
        <label for="password_confirm">비밀번호 확인</label>
        <input type="password" id="password_confirm" name="password_confirm" required autocomplete="new-password">
      </div>

      <button type="submit" class="btn">회원가입</button>
    </form>

    <div class="divider">또는</div>

    <div class="login-link">
      <a href="/auth/login">이미 계정이 있으신가요? 로그인</a>
    </div>
  </div>

  <script>
    // Client-side password confirmation validation
    document.querySelector('form').addEventListener('submit', function(e) {
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('password_confirm').value;
      if (password !== confirm) {
        e.preventDefault();
        alert('비밀번호가 일치하지 않습니다.');
        return false;
      }
    });
  </script>
</body>
</html>
  `;

  res.send(html);
}

// ==================== LOGIN HANDLER ====================
export async function handleLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.redirect('/auth/login?error=' + encodeURIComponent('아이디와 비밀번호를 입력해주세요.'));
  }

  try {
    // Find user by username
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, email, identify')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('아이디 또는 비밀번호가 올바르지 않습니다.'));
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('아이디 또는 비밀번호가 올바르지 않습니다.'));
    }

    // Check if user is approved (identify = true)
    if (!user.identify) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('계정 승인 대기 중입니다. sungjy2020@gmail.com으로 문의해주세요.'));
    }

    // Create session
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const { sessionToken, expiresAt } = await createSession(user.id, { ipAddress, userAgent });

    // Update last login
    await updateLastLogin(user.id);

    // Set session cookie
    setSessionCookie(res, sessionToken, expiresAt);

    // Redirect to home
    res.redirect('/');
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.redirect('/auth/login?error=' + encodeURIComponent('로그인 중 오류가 발생했습니다.'));
  }
}

// ==================== SIGNUP HANDLER ====================
export async function handleSignup(req, res) {
  const { username, email, password, password_confirm } = req.body;

  // Validation
  if (!username || !password || !password_confirm) {
    return res.redirect('/auth/signup?error=' + encodeURIComponent('필수 항목을 모두 입력해주세요.'));
  }

  if (password !== password_confirm) {
    return res.redirect('/auth/signup?error=' + encodeURIComponent('비밀번호가 일치하지 않습니다.'));
  }

  if (password.length < 6) {
    return res.redirect('/auth/signup?error=' + encodeURIComponent('비밀번호는 최소 6자 이상이어야 합니다.'));
  }

  if (!/^[a-zA-Z0-9_-]{3,}$/.test(username)) {
    return res.redirect('/auth/signup?error=' + encodeURIComponent('아이디는 3자 이상, 영문/숫자/언더스코어/하이픈만 사용 가능합니다.'));
  }

  try {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.redirect('/auth/signup?error=' + encodeURIComponent('이미 사용 중인 아이디입니다.'));
    }

    // Check if email already exists (if provided)
    if (email) {
      const { data: existingEmail } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingEmail) {
        return res.redirect('/auth/signup?error=' + encodeURIComponent('이미 사용 중인 이메일입니다.'));
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user (identify defaults to FALSE - requires admin approval)
    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        username,
        password_hash: passwordHash,
        email: email || null,
        identify: false  // Requires admin approval
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Auth] Signup error:', error);
      return res.redirect('/auth/signup?error=' + encodeURIComponent('회원가입 중 오류가 발생했습니다.'));
    }

    // Redirect to login with approval pending message
    res.redirect('/auth/login?message=' + encodeURIComponent('회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다. (문의: sungjy2020@gmail.com)'));
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.redirect('/auth/signup?error=' + encodeURIComponent('회원가입 중 오류가 발생했습니다.'));
  }
}

// ==================== LOGOUT HANDLER ====================
export async function handleLogout(req, res) {
  const sessionToken = getSessionTokenFromRequest(req);

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  clearSessionCookie(res);
  res.redirect('/auth/login?message=' + encodeURIComponent('로그아웃되었습니다.'));
}
