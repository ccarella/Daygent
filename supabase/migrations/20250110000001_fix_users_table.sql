-- Drop the existing users table and recreate it with proper foreign key reference
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with proper foreign key to auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  github_id BIGINT UNIQUE,
  github_username TEXT UNIQUE,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_username ON users(github_username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can manage all profiles (for auth callback)
CREATE POLICY "Service role can manage all profiles" ON users
  FOR ALL
  USING (auth.role() = 'service_role');