import { WorkspaceMember, Repository, Issue } from "@/types/workspace";
import { User } from "@/types/user";

export const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  avatar_url: "https://example.com/avatar.jpg",
  github_id: 12345,
  github_username: "testuser",
  google_id: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockWorkspace = {
  id: "workspace-123",
  name: "Test Workspace",
  slug: "test-workspace",
  created_by: "user-123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockWorkspaceMember: WorkspaceMember = {
  id: "member-123",
  workspace_id: "workspace-123",
  user_id: "user-123",
  joined_at: "2024-01-01T00:00:00Z",
};

export const mockRepository: Repository = {
  id: "repo-123",
  workspace_id: "workspace-123",
  github_id: 123456,
  name: "test-repo",
  full_name: "testuser/test-repo",
  owner: "testuser",
  private: false,
  default_branch: "main",
  installation_id: 789,
  last_synced_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockIssue: Issue = {
  id: "issue-123",
  repository_id: "repo-123",
  workspace_id: "workspace-123",
  github_issue_number: 1,
  github_issue_id: 987654,
  github_node_id: "I_123",
  title: "Test Issue",
  body: "This is a test issue",
  state: "open",
  author_github_login: "testuser",
  assignee_github_login: null,
  labels: [],
  github_created_at: "2024-01-01T00:00:00Z",
  github_updated_at: "2024-01-01T00:00:00Z",
  github_closed_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
