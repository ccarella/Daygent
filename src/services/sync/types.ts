// Type definitions for GitHub sync service

export interface RepositoryWithGitHub {
  id: string;
  organization_id: string;
  github_id: number;
  github_name: string;
  github_owner: string;
  sync_status?: string;
  last_synced_at?: string | null;
  sync_error?: string | null;
}

export interface SyncJobOptions {
  states?: ("OPEN" | "CLOSED")[];
  since?: Date;
  batchSize?: number;
}

export interface SyncMetadata {
  [key: string]: unknown;
  states?: ("OPEN" | "CLOSED")[];
  since?: string;
  batchSize?: number;
  project_id?: string;
  project_name?: string;
  lastProgress?: unknown;
  summary?: string;
}

export interface ActivityMetadata {
  repository_id: string;
  sync_type: string;
  total: number;
  created: number;
  updated: number;
  errors: number;
}

// Database types (subset of Supabase generated types)
export type Database = {
  public: {
    Tables: {
      repositories: {
        Row: RepositoryWithGitHub;
      };
      sync_jobs: {
        Row: {
          id: string;
          repository_id: string;
          started_at: string;
          completed_at: string | null;
          status: "running" | "completed" | "failed" | "cancelled";
          type: "issues" | "pull_requests" | "full";
          issues_processed: number;
          issues_created: number;
          issues_updated: number;
          errors: number;
          error_details: string[] | null;
          metadata: SyncMetadata | null;
          created_by: string;
        };
      };
    };
  };
};