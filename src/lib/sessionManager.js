/**
 * Session Manager for Admin Authentication
 * Handles session creation, validation, and cleanup
 */

import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const SESSION_COOKIE_NAME = 'admin_session';

/**
 * Generate a secure random session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex'); // 64-character hex string
}

/**
 * Create a new session for a user
 * @param {string} userId - User UUID
 * @param {Object} options - Additional session metadata
 * @returns {Promise<{sessionToken: string, expiresAt: Date}>}
 */
export async function createSession(userId, options = {}) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const { error } = await supabase
    .from('admin_sessions')
    .insert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null
    });

  if (error) {
    console.error('[SessionManager] Failed to create session:', error.message);
    throw new Error('Failed to create session');
  }

  return { sessionToken, expiresAt };
}

/**
 * Validate a session token and return user data
 * @param {string} sessionToken
 * @returns {Promise<Object|null>} User object or null if invalid
 */
export async function validateSession(sessionToken) {
  if (!sessionToken) return null;

  // Query session with user data
  const { data: session, error } = await supabase
    .from('admin_sessions')
    .select(`
      id,
      user_id,
      expires_at,
      admin_users!inner (
        id,
        username,
        email,
        created_at,
        last_login_at
      )
    `)
    .eq('session_token', sessionToken)
    .single();

  if (error || !session) {
    return null;
  }

  // Check if session is expired
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    await deleteSession(sessionToken);
    return null;
  }

  // Return user data
  return {
    userId: session.user_id,
    username: session.admin_users.username,
    email: session.admin_users.email,
    sessionId: session.id
  };
}

/**
 * Delete a session (logout)
 * @param {string} sessionToken
 */
export async function deleteSession(sessionToken) {
  if (!sessionToken) return;

  const { error } = await supabase
    .from('admin_sessions')
    .delete()
    .eq('session_token', sessionToken);

  if (error) {
    console.error('[SessionManager] Failed to delete session:', error.message);
  }
}

/**
 * Delete all sessions for a user
 * @param {string} userId
 */
export async function deleteAllUserSessions(userId) {
  const { error } = await supabase
    .from('admin_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[SessionManager] Failed to delete user sessions:', error.message);
  }
}

/**
 * Update last login timestamp
 * @param {string} userId
 */
export async function updateLastLogin(userId) {
  const { error } = await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[SessionManager] Failed to update last login:', error.message);
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions() {
  const { data, error } = await supabase
    .rpc('cleanup_expired_sessions');

  if (error) {
    console.error('[SessionManager] Failed to cleanup sessions:', error.message);
    return 0;
  }

  console.log(`[SessionManager] Cleaned up ${data || 0} expired sessions`);
  return data || 0;
}

/**
 * Extract session token from request cookies
 * @param {Object} req - Express request object
 * @returns {string|null}
 */
export function getSessionTokenFromRequest(req) {
  // Parse cookies manually (simple parser)
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const cookieMap = {};
  cookies.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    cookieMap[name] = value;
  });

  return cookieMap[SESSION_COOKIE_NAME] || null;
}

/**
 * Set session cookie in response
 * @param {Object} res - Express response object
 * @param {string} sessionToken
 * @param {Date} expiresAt
 */
export function setSessionCookie(res, sessionToken, expiresAt) {
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${sessionToken}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`
  ];

  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

/**
 * Clear session cookie
 * @param {Object} res - Express response object
 */
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

export const SESSION_CONFIG = {
  COOKIE_NAME: SESSION_COOKIE_NAME,
  DURATION: SESSION_DURATION
};
