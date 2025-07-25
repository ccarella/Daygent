# Database Migration 001: Initial Schema Implementation

## Overview

This migration implements the complete database schema for Daygent as specified in PRD.md. All tables, relationships, indexes, and Row Level Security (RLS) policies have been created.

## Migration Date

2025-07-10

## Migration Files

- `supabase/migrations/20250110000000_initial_schema.sql` - Complete schema with enum types, tables, indexes, RLS policies, and triggers
- `supabase/migrations/20250110000000_initial_schema_rollback.sql` - Rollback script for reverting changes
- `supabase/seed.sql` - Comprehensive seed data for development and testing
- `src/lib/database.types.ts` - TypeScript types generated from the database schema

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
- idx_issues_assigned_to ON issues(assigned_to)
- idx_activities_organization ON activities(organization_id)
- idx_activities_created_at ON activities(created_at DESC)
- idx_organization_members_user ON organization_members(user_id)
- idx_repositories_organization ON repositories(organization_id)

## Foreign Key Relationships

All tables have proper foreign key constraints with CASCADE DELETE where appropriate to maintain referential integrity.

## Row Level Security

RLS is enabled on all tables with policies ensuring users can only access data within their organizations. Service role bypasses RLS for admin operations.

## Testing Performed

- All tables created successfully
- RLS policies applied
- Security advisor check passed with no issues
- Foreign key relationships verified

## Improvements Based on Code Review

1. **Added SQL Migration Files**: Created actual SQL scripts in `supabase/migrations/` directory
2. **Implemented Migration Tracking**: Set up Supabase configuration with `config.toml` and migration documentation
3. **Generated TypeScript Types**: Created comprehensive type definitions in `src/lib/database.types.ts`
4. **Created Seed Data**: Added realistic test data in `supabase/seed.sql` for development

### Additional Enhancements

- **Enum Types**: Used PostgreSQL enum types for better data integrity (subscription_status, organization_role, etc.)
- **Timestamp Handling**: All timestamp columns use TIMESTAMPTZ for proper timezone support
- **Additional Indexes**: Added missing indexes for user_id and organization_id lookups
- **Rollback Strategy**: Included rollback script for safe migration reversal
- **Updated Triggers**: Added automatic updated_at triggers for all relevant tables

### Code Review Improvements (2025-01-10)

1. **Performance Indexes**: Added composite indexes for optimized queries:
   - `idx_issues_project_status` on issues(project_id, status) for project status queries
   - `idx_ai_usage_org_created` on ai_usage(organization_id, created_at DESC) for usage analytics

2. **RLS Policy Fix**: Fixed self-referential bug in organization_members INSERT policy that was preventing proper permission checks

3. **TypeScript Utilities**: Added comprehensive utility types for database operations:
   - Insert/Update types with proper field omissions for each table
   - Date parsing utilities to handle Supabase's ISO string timestamps
   - Type guards for safe date string conversion
   - Predefined date field mappings for each table

## Next Steps

1. Implement Supabase client configuration in the application
2. ~~Create TypeScript types for database tables~~ ✓ Completed
3. Implement authentication flow
4. Build data access layer with RLS-aware queries
