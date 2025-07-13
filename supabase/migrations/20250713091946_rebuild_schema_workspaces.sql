-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all existing tables
DROP TABLE IF EXISTS ai_usage CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS issue_comments CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS repositories CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all existing types
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS organization_role CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS issue_status CASCADE;
DROP TYPE IF EXISTS issue_priority CASCADE;
DROP TYPE IF EXISTS activity_type CASCADE;

-- Users (simplified)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  github_id INTEGER UNIQUE,
  github_username TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (replaces organizations)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members (simplified - everyone has full access)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- GitHub App Installations (per workspace)
CREATE TABLE github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  installation_id INTEGER UNIQUE NOT NULL,
  github_account_name TEXT NOT NULL,
  github_account_type TEXT NOT NULL, -- 'User' or 'Organization'
  installed_by UUID REFERENCES users(id),
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

-- GitHub Repositories
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  github_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  private BOOLEAN DEFAULT true,
  default_branch TEXT DEFAULT 'main',
  installation_id INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues (directly linked to repositories, no projects layer)
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  github_issue_number INTEGER NOT NULL,
  github_issue_id INTEGER UNIQUE,
  github_node_id TEXT UNIQUE,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT DEFAULT 'open', -- 'open' or 'closed'
  author_github_login TEXT,
  assignee_github_login TEXT,
  labels JSONB DEFAULT '[]',
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  github_closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, github_issue_number)
);

-- Issue Sync Status (track what we've synced)
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  last_issue_sync TIMESTAMPTZ,
  last_issue_cursor TEXT, -- For pagination
  sync_in_progress BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_issues_state ON issues(state);
CREATE INDEX idx_issues_repository ON issues(repository_id);
CREATE INDEX idx_issues_workspace ON issues(workspace_id);
CREATE INDEX idx_repositories_workspace ON repositories(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - if you're in the workspace, you can see/do everything
-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Workspace members can do everything in their workspace
CREATE POLICY "Members can view workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Workspace members policies
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can add workspace members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- GitHub installations policies
CREATE POLICY "Members can view installations" ON github_installations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = github_installations.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage installations" ON github_installations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = github_installations.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Repositories policies
CREATE POLICY "Members can view repositories" ON repositories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = repositories.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage repositories" ON repositories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = repositories.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Issues policies
CREATE POLICY "Members can view issues" ON issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = issues.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage issues" ON issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = issues.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Sync status policies
CREATE POLICY "Members can view sync status" ON sync_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN workspace_members wm ON wm.workspace_id = r.workspace_id
      WHERE r.id = sync_status.repository_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage sync status" ON sync_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN workspace_members wm ON wm.workspace_id = r.workspace_id
      WHERE r.id = sync_status.repository_id
      AND wm.user_id = auth.uid()
    )
  );

-- Function to create a workspace with the creator as member
CREATE OR REPLACE FUNCTION create_workspace_with_member(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Create workspace
  INSERT INTO workspaces (name, slug, created_by)
  VALUES (p_name, p_slug, p_user_id)
  RETURNING id INTO v_workspace_id;
  
  -- Add creator as member
  INSERT INTO workspace_members (workspace_id, user_id)
  VALUES (v_workspace_id, p_user_id);
  
  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if slug is available
CREATE OR REPLACE FUNCTION is_workspace_slug_available(p_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM workspaces WHERE slug = p_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION create_workspace_with_member TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_slug_available TO authenticated;

-- Create trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, github_id, github_username, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    (NEW.raw_user_meta_data->>'provider_id')::INTEGER,
    NEW.raw_user_meta_data->>'user_name',
    CASE 
      WHEN NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' 
      THEN NEW.raw_user_meta_data->>'sub'
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Policy to allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);