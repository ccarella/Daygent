// Workspace types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  joined_at: string;
  workspace?: Workspace;
  user?: User;
}

export interface CreateWorkspaceData {
  name: string;
  slug: string;
}

// GitHub Integration types
export interface GitHubInstallation {
  id: string;
  workspace_id: string;
  installation_id: number;
  github_account_name: string;
  github_account_type: 'User' | 'Organization';
  installed_by: string;
  installed_at: string;
}

export interface Repository {
  id: string;
  workspace_id: string;
  github_id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
  installation_id: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// Issue types (simplified)
export interface Issue {
  id: string;
  repository_id: string | null;
  workspace_id: string | null;
  github_issue_number: number;
  github_issue_id: number | null;
  github_node_id: string | null;
  title: string;
  body: string | null;
  state: string | null;
  author_github_login: string | null;
  assignee_github_login: string | null;
  labels: Array<{ name: string; color: string }> | null;
  github_created_at: string | null;
  github_updated_at: string | null;
  github_closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  
  // Relations
  repository?: Repository;
  workspace?: Workspace;
}

export interface Label {
  name: string;
  color: string;
  description?: string;
}

// Sync status
export interface SyncStatus {
  id: string;
  repository_id: string;
  last_issue_sync: string | null;
  last_issue_cursor: string | null;
  sync_in_progress: boolean;
  created_at: string;
  updated_at: string;
}

// Import User type from user.ts
import type { User } from './user';