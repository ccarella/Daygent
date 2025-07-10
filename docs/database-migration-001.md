# Database Migration 001: Initial Schema Implementation

## Overview

This migration implements the complete database schema for Daygent as specified in PRD.md. All tables, relationships, indexes, and Row Level Security (RLS) policies have been created.

## Migration Date

2025-07-10

## Tables Created

### 1. Organizations

- Workspace container for teams
- Fields: id, name, slug, subscription_status, subscription_id, trial_ends_at, seats_used, created_at, updated_at
- RLS: Users can only view/update organizations they belong to

### 2. Users

- User accounts with OAuth fields
- Fields: id, email, name, avatar_url, github_id, github_username, google_id, created_at, updated_at
- RLS: Users can view organization members, update own profile

### 3. Organization Members

- Junction table for user-organization relationships
- Fields: id, organization_id, user_id, role, invited_by, invited_at, joined_at
- Unique constraint on (organization_id, user_id)
- RLS: Members can view and invite to their organizations

### 4. Repositories

- GitHub repository connections
- Fields: id, organization_id, github_id, name, full_name, private, default_branch, installation_id, webhook_secret, created_at, updated_at
- RLS: Members can view/create/update organization repositories

### 5. Projects

- Projects within repositories
- Fields: id, repository_id, name, description, status, created_by, created_at, updated_at
- RLS: Members can view/create/update projects in organization repositories

### 6. Issues

- Core issue tracking with AI expansion
- Fields: id, project_id, repository_id, github_issue_number, github_issue_id, title, original_description, expanded_description, status, priority, created_by, assigned_to, github_pr_number, github_pr_id, created_at, updated_at, completed_at
- Unique constraint on (repository_id, github_issue_number)
- RLS: Members can view/create/update issues in organization repositories

### 7. Issue Comments

- Comments on issues
- Fields: id, issue_id, user_id, content, is_ai_generated, github_comment_id, created_at, updated_at
- RLS: Members can view/create comments on accessible issues

### 8. Activities

- Activity feed events
- Fields: id, organization_id, repository_id, project_id, issue_id, user_id, type, description, metadata, external_url, created_at
- RLS: Members can view organization activities

### 9. AI Usage

- AI usage tracking for billing
- Fields: id, organization_id, user_id, model, tokens_used, purpose, cost_cents, created_at
- RLS: Members can view organization AI usage

## Indexes Created

- idx_issues_status ON issues(status)
- idx_issues_repository ON issues(repository_id)
- idx_activities_organization ON activities(organization_id)
- idx_activities_created_at ON activities(created_at DESC)

## Foreign Key Relationships

All tables have proper foreign key constraints with CASCADE DELETE where appropriate to maintain referential integrity.

## Row Level Security

RLS is enabled on all tables with policies ensuring users can only access data within their organizations. Service role bypasses RLS for admin operations.

## Testing Performed

- All tables created successfully
- RLS policies applied
- Security advisor check passed with no issues
- Foreign key relationships verified

## Next Steps

1. Implement Supabase client configuration in the application
2. Create TypeScript types for database tables
3. Implement authentication flow
4. Build data access layer with RLS-aware queries
