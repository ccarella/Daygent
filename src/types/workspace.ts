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
}