-- Rollback migration for initial schema
-- This file can be used to revert the initial schema changes if needed

-- Drop triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
DROP TRIGGER IF EXISTS update_issue_comments_updated_at ON issue_comments;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can invite to organizations" ON organization_members;
DROP POLICY IF EXISTS "Members can view organization repositories" ON repositories;
DROP POLICY IF EXISTS "Members can create repositories" ON repositories;
DROP POLICY IF EXISTS "Members can update repositories" ON repositories;
DROP POLICY IF EXISTS "Members can view projects" ON projects;
DROP POLICY IF EXISTS "Members can create projects" ON projects;
DROP POLICY IF EXISTS "Members can update projects" ON projects;
DROP POLICY IF EXISTS "Members can view issues" ON issues;
DROP POLICY IF EXISTS "Members can create issues" ON issues;
DROP POLICY IF EXISTS "Members can update issues" ON issues;
DROP POLICY IF EXISTS "Members can view comments" ON issue_comments;
DROP POLICY IF EXISTS "Members can create comments" ON issue_comments;
DROP POLICY IF EXISTS "Members can view organization activities" ON activities;
DROP POLICY IF EXISTS "Members can view organization AI usage" ON ai_usage;

-- Drop indexes
DROP INDEX IF EXISTS idx_issues_status;
DROP INDEX IF EXISTS idx_issues_repository;
DROP INDEX IF EXISTS idx_issues_assigned_to;
DROP INDEX IF EXISTS idx_activities_organization;
DROP INDEX IF EXISTS idx_activities_created_at;
DROP INDEX IF EXISTS idx_organization_members_user;
DROP INDEX IF EXISTS idx_repositories_organization;

-- Drop tables (in reverse order of creation due to foreign key constraints)
DROP TABLE IF EXISTS ai_usage;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS issue_comments;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS repositories;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- Drop enum types
DROP TYPE IF EXISTS activity_type;
DROP TYPE IF EXISTS issue_priority;
DROP TYPE IF EXISTS issue_status;
DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS organization_role;
DROP TYPE IF EXISTS subscription_status;