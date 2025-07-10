-- Seed data for development and testing
-- This file populates the database with realistic test data

-- Insert test users
INSERT INTO users (id, email, name, avatar_url, github_id, github_username)
VALUES
  ('d0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'alice@example.com', 'Alice Johnson', 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice', 123456, 'alicejohnson'),
  ('e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'bob@example.com', 'Bob Smith', 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob', 234567, 'bobsmith'),
  ('f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'charlie@example.com', 'Charlie Brown', 'https://api.dicebear.com/9.x/avataaars/svg?seed=charlie', 345678, 'charliebrown'),
  ('a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 'diana@example.com', 'Diana Prince', 'https://api.dicebear.com/9.x/avataaars/svg?seed=diana', 456789, 'dianaprince');

-- Insert test organizations
INSERT INTO organizations (id, name, slug, subscription_status, seats_used, trial_ends_at)
VALUES
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'Acme Corp', 'acme-corp', 'active', 3, NULL),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'StartupXYZ', 'startupxyz', 'trial', 2, NOW() + INTERVAL '14 days');

-- Insert organization members
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
VALUES
  -- Acme Corp members
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'owner', NOW()),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'admin', NOW()),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'member', NOW()),
  -- StartupXYZ members
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 'owner', NOW()),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'member', NOW());

-- Insert test repositories
INSERT INTO repositories (id, organization_id, github_id, name, full_name, private, default_branch)
VALUES
  ('d6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 987654321, 'frontend', 'acme-corp/frontend', false, 'main'),
  ('e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 987654322, 'backend', 'acme-corp/backend', true, 'main'),
  ('f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 'c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 987654323, 'mobile-app', 'startupxyz/mobile-app', false, 'develop');

-- Insert test projects
INSERT INTO projects (id, repository_id, name, description, status, created_by)
VALUES
  ('a9a4f1ff-6e4d-3f7b-c823-0d1e2f3a4b5c', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'Q1 Features', 'New features for Q1 2025', 'active', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f'),
  ('b0b5a2aa-7f5e-4a8c-d934-1e2f3a4b5c6d', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'Bug Fixes', 'Critical bug fixes', 'active', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a'),
  ('c1c6b3bb-8a6f-5b9d-e045-2f3a4b5c6d7e', 'e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 'API v2', 'Major API rewrite', 'active', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f'),
  ('d2d7c4cc-9b7a-6c0e-f156-3a4b5c6d7e8f', 'f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 'MVP Launch', 'Initial MVP features', 'active', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c');

-- Insert test issues
INSERT INTO issues (id, project_id, repository_id, github_issue_number, title, original_description, expanded_description, status, priority, created_by, assigned_to)
VALUES
  -- Q1 Features project issues
  ('e3e8d5dd-0c8b-7d1f-a267-4b5c6d7e8f9a', 'a9a4f1ff-6e4d-3f7b-c823-0d1e2f3a4b5c', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 101, 'Implement dark mode', 'Add dark mode support', 
   E'## Objective\nImplement a comprehensive dark mode feature for the application.\n\n## Requirements\n- Toggle switch in settings\n- Persist user preference\n- Smooth transitions\n- WCAG AA compliance\n\n## Technical Details\n- Use CSS variables for theming\n- Implement useTheme hook\n- Add theme context provider', 
   'open', 'high', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b'),
  
  ('f4f9e6ee-1d9c-8e2a-b378-5c6d7e8f9a0b', 'a9a4f1ff-6e4d-3f7b-c823-0d1e2f3a4b5c', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 102, 'Add search functionality', 'Users need search', 
   E'## Objective\nImplement global search functionality across all resources.\n\n## Requirements\n- Real-time search results\n- Search history\n- Keyboard shortcuts (Cmd+K)\n- Filter by resource type\n\n## Implementation\n- Use Algolia or ElasticSearch\n- Implement search index\n- Add search UI component', 
   'in_progress', 'high', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a'),
  
  -- Bug Fixes project issues
  ('a5a0f7ff-2e0d-9f3b-c489-6d7e8f9a0b1c', 'b0b5a2aa-7f5e-4a8c-d934-1e2f3a4b5c6d', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 103, 'Fix login redirect loop', 'Login keeps redirecting', 
   E'## Bug Description\nUsers are experiencing infinite redirect loops after login.\n\n## Steps to Reproduce\n1. Log out\n2. Navigate to protected route\n3. Login\n4. Observe redirect loop\n\n## Root Cause\nAuth middleware conflict with Next.js routing\n\n## Solution\n- Update auth middleware\n- Fix redirect logic\n- Add proper error handling', 
   'review', 'urgent', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a'),
  
  -- API v2 project issues
  ('b6b1a8aa-3f1e-0a4c-d590-7e8f9a0b1c2d', 'c1c6b3bb-8a6f-5b9d-e045-2f3a4b5c6d7e', 'e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 201, 'Design GraphQL schema', 'Create GraphQL API schema', 
   E'## Objective\nDesign and implement GraphQL schema for API v2.\n\n## Requirements\n- Type-safe schema\n- Efficient query resolution\n- Real-time subscriptions\n- Proper error handling\n\n## Schema Design\n- User types\n- Organization types\n- Issue types\n- Mutation definitions\n- Subscription definitions', 
   'completed', 'high', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f'),
  
  -- MVP Launch project issues
  ('c7c2b9bb-4a2f-1b5d-e601-8f9a0b1c2d3e', 'd2d7c4cc-9b7a-6c0e-f156-3a4b5c6d7e8f', 'f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 301, 'Setup push notifications', 'Mobile push notifications', 
   E'## Objective\nImplement push notifications for mobile app.\n\n## Requirements\n- iOS and Android support\n- User preferences\n- Notification categories\n- Deep linking\n\n## Technical Implementation\n- Firebase Cloud Messaging\n- APNs for iOS\n- Notification service\n- User settings UI', 
   'open', 'medium', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', NULL);

-- Insert test issue comments
INSERT INTO issue_comments (issue_id, user_id, content, is_ai_generated)
VALUES
  ('e3e8d5dd-0c8b-7d1f-a267-4b5c6d7e8f9a', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'I''ll start working on this today. Planning to use CSS variables as suggested.', false),
  ('e3e8d5dd-0c8b-7d1f-a267-4b5c6d7e8f9a', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'Great! Make sure to test with high contrast mode for accessibility.', false),
  ('f4f9e6ee-1d9c-8e2a-b378-5c6d7e8f9a0b', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'I''ve implemented the basic search UI. Working on the backend integration now.', false),
  ('a5a0f7ff-2e0d-9f3b-c489-6d7e8f9a0b1c', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'Fix is ready for review. The issue was in the middleware order.', false),
  ('b6b1a8aa-3f1e-0a4c-d590-7e8f9a0b1c2d', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'Schema design is complete. Moving on to resolver implementation.', false);

-- Insert test activities
INSERT INTO activities (organization_id, repository_id, project_id, issue_id, user_id, type, description, metadata)
VALUES
  -- Recent activities for Acme Corp
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'a9a4f1ff-6e4d-3f7b-c823-0d1e2f3a4b5c', 'e3e8d5dd-0c8b-7d1f-a267-4b5c6d7e8f9a', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 
   'issue_created', 'Alice Johnson created issue #101: Implement dark mode', '{"issue_title": "Implement dark mode", "issue_number": 101}'),
  
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'a9a4f1ff-6e4d-3f7b-c823-0d1e2f3a4b5c', 'f4f9e6ee-1d9c-8e2a-b378-5c6d7e8f9a0b', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 
   'issue_created', 'Bob Smith created issue #102: Add search functionality', '{"issue_title": "Add search functionality", "issue_number": 102}'),
  
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'b0b5a2aa-7f5e-4a8c-d934-1e2f3a4b5c6d', NULL, 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 
   'project_created', 'Bob Smith created project: Bug Fixes', '{"project_name": "Bug Fixes"}'),
  
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 'c1c6b3bb-8a6f-5b9d-e045-2f3a4b5c6d7e', 'b6b1a8aa-3f1e-0a4c-d590-7e8f9a0b1c2d', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 
   'issue_completed', 'Alice Johnson completed issue #201: Design GraphQL schema', '{"issue_title": "Design GraphQL schema", "issue_number": 201}'),
  
  -- Recent activities for StartupXYZ
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 'd2d7c4cc-9b7a-6c0e-f156-3a4b5c6d7e8f', NULL, 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 
   'project_created', 'Diana Prince created project: MVP Launch', '{"project_name": "MVP Launch"}'),
  
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', NULL, NULL, NULL, 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 
   'member_invited', 'Diana Prince invited alice@example.com to join StartupXYZ', '{"invited_email": "alice@example.com"}');

-- Insert test AI usage records
INSERT INTO ai_usage (organization_id, user_id, model, tokens_used, purpose, cost_cents)
VALUES
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'claude-3-opus', 2500, 'issue_expansion', 25),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'claude-3-sonnet', 1800, 'issue_expansion', 18),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'claude-3-haiku', 1200, 'code_generation', 12),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 'claude-3-opus', 3000, 'issue_expansion', 30),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 'claude-3-sonnet', 1500, 'code_review', 15);

-- Update completed_at for completed issues
UPDATE issues 
SET completed_at = NOW() - INTERVAL '2 days'
WHERE status = 'completed';