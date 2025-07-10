-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'inactive', 'cancelled');
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE project_status AS ENUM ('active', 'archived');
CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'review', 'completed', 'cancelled');
CREATE TYPE issue_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE activity_type AS ENUM (
  'issue_created',
  'issue_updated',
  'issue_completed',
  'issue_comment',
  'project_created',
  'repository_connected',
  'member_invited',
  'member_joined'
);

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  seats_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  github_id BIGINT UNIQUE,
  github_username TEXT UNIQUE,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization_members junction table
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);

-- Create repositories table
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  private BOOLEAN DEFAULT false,
  default_branch TEXT DEFAULT 'main',
  installation_id BIGINT,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_issue_number INTEGER,
  github_issue_id BIGINT,
  title TEXT NOT NULL,
  original_description TEXT,
  expanded_description TEXT,
  status issue_status DEFAULT 'open',
  priority issue_priority DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  github_pr_number INTEGER,
  github_pr_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(repository_id, github_issue_number)
);

-- Create issue_comments table
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  github_comment_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type activity_type NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_usage table
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_repository ON issues(repository_id);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_project_status ON issues(project_id, status); -- Composite index for project status queries
CREATE INDEX idx_activities_organization ON activities(organization_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_repositories_organization ON repositories(organization_id);
CREATE INDEX idx_ai_usage_org_created ON ai_usage(organization_id, created_at DESC); -- Index for usage analytics

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view organization members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = users.id
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can invite to organizations"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = NEW.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for repositories
CREATE POLICY "Members can view organization repositories"
  ON repositories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = repositories.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create repositories"
  ON repositories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = repositories.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update repositories"
  ON repositories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = repositories.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policies for projects
CREATE POLICY "Members can view projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = projects.repository_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = projects.repository_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update projects"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = projects.repository_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for issues
CREATE POLICY "Members can view issues"
  ON issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = issues.repository_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create issues"
  ON issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = issues.repository_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update issues"
  ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = issues.repository_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for issue_comments
CREATE POLICY "Members can view comments"
  ON issue_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN repositories r ON r.id = i.repository_id
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE i.id = issue_comments.issue_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create comments"
  ON issue_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM issues i
      JOIN repositories r ON r.id = i.repository_id
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE i.id = issue_comments.issue_id
        AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for activities
CREATE POLICY "Members can view organization activities"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = activities.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- RLS Policies for ai_usage
CREATE POLICY "Members can view organization AI usage"
  ON ai_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = ai_usage.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issue_comments_updated_at BEFORE UPDATE ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();