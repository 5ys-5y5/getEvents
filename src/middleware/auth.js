/**
 * Authentication Middleware
 * Protects routes by requiring valid admin session
 */

import { validateSession, getSessionTokenFromRequest } from '../lib/sessionManager.js';

/**
 * Middleware to require authentication
 * Redirects to login page if not authenticated
 */
export async function requireAuth(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);

  if (!sessionToken) {
    return res.redirect('/auth/login');
  }

  const user = await validateSession(sessionToken);

  if (!user) {
    // Session invalid or expired
    return res.redirect('/auth/login?error=' + encodeURIComponent('세션이 만료되었습니다. 다시 로그인해주세요.'));
  }

  // Attach user to request object
  req.user = user;
  next();
}

/**
 * Middleware to check if user is already authenticated
 * Redirects to home if already logged in (for login/signup pages)
 */
export async function redirectIfAuthenticated(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);

  if (sessionToken) {
    const user = await validateSession(sessionToken);
    if (user) {
      return res.redirect('/');
    }
  }

  next();
}

/**
 * Middleware to optionally attach user if authenticated
 * Does not redirect, just adds user to req if session is valid
 */
export async function attachUserIfAuthenticated(req, res, next) {
  const sessionToken = getSessionTokenFromRequest(req);

  if (sessionToken) {
    const user = await validateSession(sessionToken);
    if (user) {
      req.user = user;
    }
  }

  next();
}
