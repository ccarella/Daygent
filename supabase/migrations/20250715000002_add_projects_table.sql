-- Add projects table back to support the existing codebase
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add project_id to issues table
ALTER TABLE issues ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_default ON projects(workspace_id, is_default) WHERE is_default = true;
CREATE INDEX idx_issues_project ON issues(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Function to ensure workspace has a default project
CREATE OR REPLACE FUNCTION ensure_default_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default project for the workspace
  INSERT INTO projects (workspace_id, name, description, is_default, created_by)
  VALUES (NEW.id, 'Default Project', 'Default project for ' || NEW.name, true, NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default project when workspace is created
CREATE TRIGGER create_default_project_on_workspace
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION ensure_default_project();

-- Migrate existing workspaces to have default projects
INSERT INTO projects (workspace_id, name, description, is_default, created_by)
SELECT 
  w.id,
  'Default Project',
  'Default project for ' || w.name,
  true,
  w.created_by
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.workspace_id = w.id 
  AND p.is_default = true
);

-- Set project_id for existing issues based on their repository's workspace
UPDATE issues i
SET project_id = p.id
FROM repositories r
JOIN projects p ON p.workspace_id = r.workspace_id AND p.is_default = true
WHERE i.repository_id = r.id
AND i.project_id IS NULL;