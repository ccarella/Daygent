import { GET_ISSUES } from "@/lib/github/queries/issues";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { GitHubGraphQLClient } from "@/lib/github/client";
import { withRetry, isTransientError, isGitHubRateLimitError } from "@/lib/utils/retry";
import { 
  getWorkspaceFromRepository
} from "@/app/api/webhooks/github/db-utils";
import { ActivityMetadata } from "./types";
import { 
  GitHubIssue, 
  mapGitHubIssueToSyncData,
  extractPriorityFromLabels,
  generateSyncSummary
} from "./issueMapper";
import { IssueSyncData } from "@/app/api/webhooks/github/types";

export interface SyncOptions {
  states?: ("OPEN" | "CLOSED")[];
  since?: Date;
  batchSize?: number;
  maxDuration?: number; // Maximum sync duration in milliseconds
  maxIssues?: number; // Maximum number of issues to sync
  onProgress?: (progress: SyncProgress) => void;
  abortSignal?: AbortSignal; // Allow cancellation of sync operations
}

export interface SyncProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  currentPage: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  issuesProcessed: number;
  created: number;
  updated: number;
  errors: number;
  summary: string;
  errorDetails?: string[];
}

export interface RepositoryInfo {
  id: string;
  workspace_id: string;
  github_id: number;
  github_name: string;
  github_owner: string;
}

export class GitHubSyncService {
  private client: GitHubGraphQLClient;
  private supabase?: Awaited<ReturnType<typeof createServiceRoleClient>>;

  constructor(client: GitHubGraphQLClient) {
    this.client = client;
  }

  async initialize() {
    this.supabase = await createServiceRoleClient();
  }

  private getSupabase() {
    if (!this.supabase) {
      throw new Error("GitHubSyncService not initialized. Call initialize() first.");
    }
    return this.supabase;
  }

  /**
   * Sync all issues from a GitHub repository to the database
   */
  async syncRepositoryIssues(
    repository: RepositoryInfo,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const {
      states = ["OPEN", "CLOSED"],
      batchSize = 50,
      maxDuration = 10 * 60 * 1000, // 10 minutes default
      maxIssues = 5000, // Default max issues to sync
      onProgress,
      abortSignal
    } = options;

    // Initialize tracking
    const startTime = Date.now();
    let totalCount = 0;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const MAX_ERROR_DETAILS = 100; // Prevent memory leak
    let cursor: string | null = null;
    let currentPage = 0;

    // Get workspace from repository
    const workspaceId = await getWorkspaceFromRepository(repository.id);
    if (!workspaceId) {
      console.error(`[Sync] No workspace found for repository ${repository.github_name}`);
      return {
        success: false,
        issuesProcessed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        summary: "Failed to get workspace for repository",
        errorDetails: ["Repository must belong to a workspace"]
      };
    }

    // Start sync process
    try {
      // Update sync status
      await this.updateRepositorySyncStatus(repository.id, "syncing");

      do {
        currentPage++;
        
        // Fetch batch of issues from GitHub
        type IssueQueryResponse = {
          repository: {
            issues: {
              totalCount: number;
              pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
              };
              nodes: GitHubIssue[];
            };
          };
        };
        
        const response: IssueQueryResponse = await withRetry(
          () => this.client.query<IssueQueryResponse>(
            GET_ISSUES,
            {
              owner: repository.github_owner,
              name: repository.github_name,
              first: batchSize,
              after: cursor,
              states,
              orderBy: { field: "UPDATED_AT", direction: "DESC" }
            },
            {
              fetchPolicy: "network-only" // Always fetch fresh data
            }
          ),
          {
            maxAttempts: 3,
            retryCondition: (error) => isTransientError(error) || isGitHubRateLimitError(error),
            onRetry: (attempt, error) => {
              console.log(`[Sync] Retrying GitHub API call (attempt ${attempt}):`, error);
              if (onProgress) {
                onProgress({
                  total: totalCount,
                  processed,
                  created,
                  updated,
                  errors,
                  currentPage,
                  message: `Retrying GitHub API call (attempt ${attempt})...`
                });
              }
            }
          }
        );

        const issuesData: IssueQueryResponse["repository"]["issues"] | undefined = response.repository?.issues;
        if (!issuesData) {
          throw new Error("Failed to fetch issues from GitHub");
        }

        totalCount = issuesData.totalCount;
        const issues = issuesData.nodes || [];

        // Check if we've exceeded limits
        if (totalCount > maxIssues) {
          console.warn(`[Sync] Repository has ${totalCount} issues, exceeding limit of ${maxIssues}. Sync will be limited.`);
        }

        // Process issues in batch for better performance
        const batchResult = await this.syncIssueBatch(
          repository,
          issues,
          workspaceId,
          {
            onProgress: (issueNumber, title) => {
              // Check for cancellation
              if (abortSignal?.aborted) {
                throw new Error("Sync operation was cancelled");
              }

              // Check duration limit
              if (Date.now() - startTime > maxDuration) {
                throw new Error(`Sync exceeded maximum duration of ${maxDuration}ms`);
              }

              // Check issue count limit
              if (processed >= maxIssues) {
                return false; // Stop processing
              }

              processed++;
              
              // Report progress
              if (onProgress) {
                onProgress({
                  total: totalCount,
                  processed,
                  created,
                  updated,
                  errors,
                  currentPage,
                  message: `Processing issue #${issueNumber}: ${title}`
                });
              }
              
              return true; // Continue processing
            }
          }
        );

        created += batchResult.created;
        updated += batchResult.updated;
        errors += batchResult.errors;

        // Add error details
        for (const error of batchResult.errorDetails) {
          if (errorDetails.length < MAX_ERROR_DETAILS) {
            errorDetails.push(error);
          } else if (errorDetails.length === MAX_ERROR_DETAILS) {
            errorDetails.push(`... and ${errors - MAX_ERROR_DETAILS} more errors`);
            break;
          }
        }

        // Check if we should stop due to limits
        if (processed >= maxIssues) {
          console.warn(`[Sync] Reached maximum issue limit of ${maxIssues}`);
          cursor = null; // Stop pagination
        }

        // Check for next page
        cursor = issuesData.pageInfo.hasNextPage ? issuesData.pageInfo.endCursor : null;

      } while (cursor);

      // Update sync status
      await this.updateRepositorySyncStatus(repository.id, "synced");

      // Generate summary
      const summary = generateSyncSummary(processed, created, updated, errors);

      // Log sync activity
      await this.logSyncActivity(repository.id, summary, {
        repository_id: repository.id,
        sync_type: "issues",
        total: processed,
        created,
        updated,
        errors
      });

      return {
        success: errors === 0,
        issuesProcessed: processed,
        created,
        updated,
        errors,
        summary,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined
      };

    } catch (error) {
      // Update sync status on failure
      await this.updateRepositorySyncStatus(repository.id, "error");

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("[Sync] Fatal error during sync:", error);

      return {
        success: false,
        issuesProcessed: processed,
        created,
        updated,
        errors: errors + 1,
        summary: `Sync failed: ${errorMessage}`,
        errorDetails: [...errorDetails, errorMessage]
      };
    }
  }

  /**
   * Sync a batch of issues with better performance
   */
  private async syncIssueBatch(
    repository: RepositoryInfo,
    issues: GitHubIssue[],
    workspaceId: string,
    options: {
      onProgress?: (issueNumber: number, title: string) => boolean;
    } = {}
  ): Promise<{ created: number; updated: number; errors: number; errorDetails: string[] }> {
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Get existing issues in batch
    const issueNumbers = issues.map(i => i.number);
    const { data: existingIssues } = await this.getSupabase()
      .from("issues")
      .select("id, github_issue_number, expanded_description, priority")
      .eq("repository_id", repository.id)
      .in("github_issue_number", issueNumbers);

    // Create a map for quick lookup
    const existingIssueMap = new Map(
      (existingIssues || []).map(issue => [issue.github_issue_number, issue])
    );

    // Prepare batch operations
    interface IssueCreateData {
      workspace_id: string;
      repository_id: string;
      github_issue_number: number;
      github_issue_id: number;
      title: string;
      body: string | null;
      state: string;
      author_github_login: string | null;
      assignee_github_login: string | null;
      labels: any;
      github_created_at: string;
      github_updated_at: string;
      github_closed_at: string | null;
    }
    
    interface IssueUpdateData {
      id: string;
      title: string;
      body: string | null;
      state: string;
      author_github_login: string | null;
      assignee_github_login: string | null;
      labels: any;
      github_updated_at: string;
      github_closed_at: string | null;
    }
    
    const issuesToCreate: IssueCreateData[] = [];
    const issuesToUpdate: IssueUpdateData[] = [];

    for (const issue of issues) {
      // Check progress callback
      if (options.onProgress) {
        const shouldContinue = options.onProgress(issue.number, issue.title);
        if (!shouldContinue) break;
      }

      try {
        // Resolve assignee if present
        let assigneeUserId: string | null = null;
        if (issue.assignees.nodes.length > 0) {
          const firstAssignee = issue.assignees.nodes[0];
          const user = await this.resolveGitHubUser(firstAssignee.login);
          assigneeUserId = user?.id || null;
        }

        // Map to sync data format
        const syncData = mapGitHubIssueToSyncData(issue, assigneeUserId);
        const priority = extractPriorityFromLabels(issue.labels) || "medium";

        const existingIssue = existingIssueMap.get(issue.number);

        if (existingIssue) {
          // Prepare update
          issuesToUpdate.push({
            id: existingIssue.id,
            title: syncData.title,
            body: syncData.original_description,
            state: syncData.status === "completed" ? "closed" : "open",
            author_github_login: issue.author?.login || null,
            assignee_github_login: issue.assignees?.nodes?.[0]?.login || null,
            labels: issue.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
            github_updated_at: syncData.updated_at,
            github_closed_at: syncData.completed_at || null,
          });
        } else {
          // Prepare creation
          issuesToCreate.push({
            workspace_id: workspaceId,
            repository_id: repository.id,
            github_issue_number: syncData.github_issue_number,
            github_issue_id: syncData.github_issue_id,
            title: syncData.title,
            body: syncData.original_description,
            state: syncData.status === "completed" ? "closed" : "open",
            author_github_login: issue.author?.login || null,
            assignee_github_login: issue.assignees?.nodes?.[0]?.login || null,
            labels: issue.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
            github_created_at: issue.createdAt,
            github_updated_at: syncData.updated_at,
            github_closed_at: syncData.completed_at || null,
          });
        }
      } catch (error) {
        errors++;
        const errorMessage = `Failed to prepare issue #${issue.number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errorDetails.push(errorMessage);
        console.error(`[Sync] ${errorMessage}`, error);
      }
    }

    // Execute batch operations
    if (issuesToCreate.length > 0) {
      const { error } = await this.getSupabase()
        .from("issues")
        .insert(issuesToCreate);

      if (error) {
        errors += issuesToCreate.length;
        errorDetails.push(`Failed to create ${issuesToCreate.length} issues: ${error.message}`);
        console.error("[Sync] Batch create failed:", error);
      } else {
        created += issuesToCreate.length;
      }
    }

    if (issuesToUpdate.length > 0) {
      // Supabase doesn't support batch updates efficiently, so we'll do them individually
      // but in parallel for better performance
      const updatePromises = issuesToUpdate.map(async (issue) => {
        try {
          const { error } = await this.getSupabase()
            .from("issues")
            .update(issue)
            .eq("id", issue.id);
          
          if (error) throw error;
          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      updated += successCount;
      if (failureCount > 0) {
        errors += failureCount;
        errorDetails.push(`Failed to update ${failureCount} issues`);
      }
    }

    return { created, updated, errors, errorDetails };
  }

  /**
   * Sync a single issue
   */
  private async syncSingleIssue(
    repository: RepositoryInfo,
    issue: GitHubIssue,
    workspaceId: string
  ): Promise<{ created: boolean; updated: boolean }> {
    // Resolve assignee if present
    let assigneeUserId: string | null = null;
    if (issue.assignees.nodes.length > 0) {
      const firstAssignee = issue.assignees.nodes[0];
      const user = await this.resolveGitHubUser(firstAssignee.login);
      assigneeUserId = user?.id || null;
    }

    // Map to sync data format
    const syncData = mapGitHubIssueToSyncData(issue, assigneeUserId);

    // Check if issue exists
    const { data: existingIssue } = await this.getSupabase()
      .from("issues")
      .select("id, github_issue_id, expanded_description, priority")
      .eq("repository_id", repository.id)
      .eq("github_issue_number", issue.number)
      .single();

    if (existingIssue) {
      // Update existing issue
      const priority = extractPriorityFromLabels(issue.labels) || existingIssue.priority;
      
      const { error } = await this.getSupabase()
        .from("issues")
        .update({
          title: syncData.title,
          body: syncData.original_description,
          state: syncData.status === "completed" ? "closed" : "open",
          author_github_login: issue.author?.login || null,
          assignee_github_login: issue.assignees?.nodes?.[0]?.login || null,
          labels: issue.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
          github_updated_at: syncData.updated_at,
          github_closed_at: syncData.completed_at,
        })
        .eq("id", existingIssue.id);

      if (error) throw error;
      return { created: false, updated: true };
    } else {
      // Create new issue
      const priority = extractPriorityFromLabels(issue.labels) || "medium";
      
      const { error } = await this.getSupabase()
        .from("issues")
        .insert({
          workspace_id: workspaceId,
          repository_id: repository.id,
          github_issue_number: syncData.github_issue_number,
          github_issue_id: syncData.github_issue_id,
          title: syncData.title,
          body: syncData.original_description,
          state: syncData.status === "completed" ? "closed" : "open",
          author_github_login: issue.author?.login || null,
          assignee_github_login: issue.assignees?.nodes?.[0]?.login || null,
          labels: issue.labels?.nodes?.map((l: any) => ({ name: l.name, color: l.color })) || [],
          github_created_at: issue.createdAt,
          github_updated_at: syncData.updated_at,
          github_closed_at: syncData.completed_at,
        });

      if (error) throw error;
      return { created: true, updated: false };
    }
  }

  /**
   * Resolve GitHub user to database user
   */
  private async resolveGitHubUser(githubLogin: string) {
    // Try to find user by GitHub username
    const { data } = await this.getSupabase()
      .from("users")
      .select("*")
      .eq("github_username", githubLogin)
      .single();

    return data;
  }

  /**
   * Get system user ID for created_by field
   */
  private async getSystemUserId(): Promise<string> {
    const { data } = await this.getSupabase()
      .from("users")
      .select("id")
      .eq("email", "system@daygent.com")
      .single();

    if (!data) {
      throw new Error("System user not found");
    }

    return data.id;
  }


  /**
   * Log sync activity
   */
  private async logSyncActivity(
    repositoryId: string,
    description: string,
    metadata: ActivityMetadata
  ) {
    const { data: repository } = await this.getSupabase()
      .from("repositories")
      .select("workspace_id")
      .eq("id", repositoryId)
      .single();

    if (!repository) return;

    // Activity logging removed - no activities table
  }

  /**
   * Update repository sync status
   */
  private async updateRepositorySyncStatus(
    repositoryId: string, 
    status: "pending" | "syncing" | "synced" | "error",
    error?: string
  ) {
    const updateData: {
      sync_status: string;
      updated_at: string;
      last_synced_at?: string;
      sync_error?: string | null;
    } = {
      sync_status: status,
      updated_at: new Date().toISOString()
    };
    
    if (status === "synced") {
      updateData.last_synced_at = new Date().toISOString();
      updateData.sync_error = null;
    } else if (status === "error" && error) {
      updateData.sync_error = error;
    }
    
    await this.getSupabase()
      .from("repositories")
      .update(updateData)
      .eq("id", repositoryId);
  }
}