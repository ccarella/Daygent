-- Fix foreign key constraints that were dropped when users table was recreated
-- The fix_users_table migration dropped these constraints when it recreated the users table with CASCADE

-- Fix issues table foreign keys
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_created_by_fkey;
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_assigned_to_fkey;

ALTER TABLE issues 
  ADD CONSTRAINT issues_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE issues 
  ADD CONSTRAINT issues_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix other tables that reference users
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE projects
  ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE issue_comments DROP CONSTRAINT IF EXISTS issue_comments_user_id_fkey;
ALTER TABLE issue_comments
  ADD CONSTRAINT issue_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_user_id_fkey;
ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;
