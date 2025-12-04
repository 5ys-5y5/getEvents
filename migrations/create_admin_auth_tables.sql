-- ============================================
-- Admin Authentication System
-- ============================================
-- This migration creates tables for admin user authentication
-- using username/password login instead of API keys

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  identify BOOLEAN DEFAULT FALSE,              -- Email verification status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$')
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 2. Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,

  CONSTRAINT session_token_length CHECK (char_length(session_token) >= 32)
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- 3. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to auto-update updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Function to clean expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Create default admin user (username: admin, password: admin123)
-- Password hash is bcrypt hash of 'admin123'
-- You should change this password immediately after first login!
INSERT INTO admin_users (username, password_hash, email, identify)
VALUES (
  'admin',
  '$2b$10$YourBcryptHashWillGoHere',
  'admin@example.com',
  TRUE  -- Default admin is pre-approved
)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- Usage Notes:
-- ============================================
-- 1. After running this migration, you need to hash the password properly
-- 2. Session tokens are UUID v4 strings (128-bit)
-- 3. Sessions expire after 24 hours by default (set in application)
-- 4. Run cleanup_expired_sessions() periodically (e.g., daily cron job)
--
-- Example: Manually create an admin user with bcrypt
-- INSERT INTO admin_users (username, password_hash, email)
-- VALUES ('yourusername', '$2b$10$...bcrypt_hash_here...', 'your@email.com');
--
-- Example: Clean expired sessions
-- SELECT cleanup_expired_sessions();
