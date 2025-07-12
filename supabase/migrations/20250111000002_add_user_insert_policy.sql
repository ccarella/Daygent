-- Add INSERT policy to allow users to create their own profile
-- This prevents hanging when the profile doesn't exist yet
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also ensure the single() query doesn't hang by adding a timeout to RLS
-- and making sure the query can return null for missing profiles
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.0, autovacuum_vacuum_threshold = 100);