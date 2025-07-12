-- Add sync metadata fields to repositories table
ALTER TABLE repositories
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Add comment for clarity
COMMENT ON COLUMN repositories.sync_status IS 'Current status of issue synchronization';
COMMENT ON COLUMN repositories.last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN repositories.sync_error IS 'Error message from last failed sync';

-- Create index for filtering by sync status
CREATE INDEX IF NOT EXISTS idx_repositories_sync_status ON repositories(sync_status);

-- Create a table to track sync jobs (optional, for more detailed tracking)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  type TEXT NOT NULL CHECK (type IN ('issues', 'pull_requests', 'full')),
  issues_processed INTEGER DEFAULT 0,
  issues_created INTEGER DEFAULT 0,
  issues_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Add indexes for sync jobs
CREATE INDEX idx_sync_jobs_repository_id ON sync_jobs(repository_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_started_at ON sync_jobs(started_at DESC);

-- Add RLS policies for sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view sync jobs for repositories in their organizations
CREATE POLICY "Users can view sync jobs for their repositories" ON sync_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = sync_jobs.repository_id
      AND om.user_id = auth.uid()
    )
  );

-- Users with admin/owner role can create sync jobs
CREATE POLICY "Admins can create sync jobs" ON sync_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = sync_jobs.repository_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Users with admin/owner role can update sync jobs
CREATE POLICY "Admins can update sync jobs" ON sync_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM repositories r
      JOIN organization_members om ON om.organization_id = r.organization_id
      WHERE r.id = sync_jobs.repository_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sync_jobs TO authenticated;
GRANT SELECT ON sync_jobs TO anon;