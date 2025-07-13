-- Seed data for development and testing
-- This file populates the database with realistic test data

-- Insert test users
INSERT INTO users (id, email, name, avatar_url, github_id, github_username)
VALUES
  ('d0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', 'alice@example.com', 'Alice Johnson', 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice', 123456, 'alicejohnson'),
  ('e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', 'bob@example.com', 'Bob Smith', 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob', 234567, 'bobsmith'),
  ('f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', 'charlie@example.com', 'Charlie Brown', 'https://api.dicebear.com/9.x/avataaars/svg?seed=charlie', 345678, 'charliebrown'),
  ('a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', 'diana@example.com', 'Diana Prince', 'https://api.dicebear.com/9.x/avataaars/svg?seed=diana', 456789, 'dianaprince');

-- Insert test workspaces
INSERT INTO workspaces (id, name, slug, created_by)
VALUES
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'Acme Corp', 'acme-corp', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f'),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'StartupXYZ', 'startupxyz', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c');

-- Insert workspace members
INSERT INTO workspace_members (workspace_id, user_id, joined_at)
VALUES
  -- Acme Corp members
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', NOW()),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'e1e6d3f7-8c6b-5d9f-a04b-2b3c4d5e6f7a', NOW()),
  ('b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 'f2f7e4f8-9d7c-6e0a-b15c-3c4d5e6f7a8b', NOW()),
  -- StartupXYZ members
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'a3a8f5f9-0e8d-7f1b-c26d-4d5e6f7a8b9c', NOW()),
  ('c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 'd0d5c2f6-7b5a-4c8e-9f3a-1a2b3c4d5e6f', NOW());

-- Insert test repositories
INSERT INTO repositories (id, workspace_id, github_id, name, full_name, owner, private, default_branch)
VALUES
  ('d6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 987654321, 'frontend', 'acme-corp/frontend', 'acme-corp', false, 'main'),
  ('e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 987654322, 'backend', 'acme-corp/backend', 'acme-corp', true, 'main'),
  ('f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 'c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 987654323, 'mobile-app', 'startupxyz/mobile-app', 'startupxyz', false, 'develop');

-- Insert test issues
INSERT INTO issues (id, repository_id, workspace_id, github_issue_number, title, body, state, author_github_login)
VALUES
  -- Frontend issues
  ('e3e8d5dd-0c8b-7d1f-a267-4b5c6d7e8f9a', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 101, 'Implement dark mode', 
   E'## Objective\nImplement a comprehensive dark mode feature for the application.\n\n## Requirements\n- Toggle switch in settings\n- Persist user preference\n- Smooth transitions\n- WCAG AA compliance\n\n## Technical Details\n- Use CSS variables for theming\n- Implement useTheme hook\n- Add theme context provider', 
   'open', 'alicejohnson'),
  
  ('f4f9e6ee-1d9c-8e2a-b378-5c6d7e8f9a0b', 'd6d1c8fc-3b1a-0c4e-f590-7a8b9c0d1e2f', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 102, 'Add search functionality', 
   E'## Objective\nImplement global search functionality across all resources.\n\n## Requirements\n- Real-time search results\n- Search history\n- Keyboard shortcuts (Cmd+K)\n- Filter by resource type\n\n## Implementation\n- Use Algolia or ElasticSearch\n- Implement search index\n- Add search UI component', 
   'open', 'bobsmith'),
  
  -- Backend issues
  ('b6b1a8aa-3f1e-0a4c-d590-7e8f9a0b1c2d', 'e7e2d9fd-4c2b-1d5f-a601-8b9c0d1e2f3a', 'b4b9a6fa-1f9e-8a2c-d37e-5e6f7a8b9c0d', 201, 'Design GraphQL schema', 
   E'## Objective\nDesign and implement GraphQL schema for API v2.\n\n## Requirements\n- Type-safe schema\n- Efficient query resolution\n- Real-time subscriptions\n- Proper error handling\n\n## Schema Design\n- User types\n- Organization types\n- Issue types\n- Mutation definitions\n- Subscription definitions', 
   'closed', 'alicejohnson'),
  
  -- Mobile app issues
  ('c7c2b9bb-4a2f-1b5d-e601-8f9a0b1c2d3e', 'f8f3e0fe-5d3c-2e6a-b712-9c0d1e2f3a4b', 'c5c0b7fb-2a0f-9b3d-e48f-6f7a8b9c0d1e', 301, 'Setup push notifications', 
   E'## Objective\nImplement push notifications for mobile app.\n\n## Requirements\n- iOS and Android support\n- User preferences\n- Notification categories\n- Deep linking\n\n## Technical Implementation\n- Firebase Cloud Messaging\n- APNs for iOS\n- Notification service\n- User settings UI', 
   'open', 'dianaprince');