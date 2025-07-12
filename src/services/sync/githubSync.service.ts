import { GET_ISSUES } from "@/lib/github/queries/issues";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { GitHubGraphQLClient } from "@/lib/github/client";
import { 
  getOrCreateUserByGithubId,
  getProjectByRepositoryId,
  syncIssue
} from "@/app/api/webhooks/github/db-utils";
import { 
  GitHubIssue, 
  mapGitHubIssueToSyncData,
  extractPriorityFromLabels,
  generateSyncSummary
} from "./issueMapper";

export interface SyncOptions {
  states?: ("OPEN" | "CLOSED")[];
  since?: Date;
  batchSize?: number;
  onProgress?: (progress: SyncProgress) => void;
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
  organization_id: string;
  github_id: number;
  github_name: string;
  github_owner: string;
}

export class GitHubSyncService {
  private client: GitHubGraphQLClient;
  private supabase?: SupabaseClient<any, any, any>;

  constructor(client: GitHubGraphQLClient) {
    this.client = client;
  }

  async initialize() {
    this.supabase = await createServiceRoleClient();
  }

  private getSupabase(): SupabaseClient<any, any, any> {
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
      onProgress
    } = options;

    // Initialize tracking
    let totalCount = 0;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    let cursor: string | null = null;
    let currentPage = 0;

    // Check if project exists for this repository
    const project = await getProjectByRepositoryId(repository.id);
    if (!project) {
      return {
        success: false,
        issuesProcessed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        summary: "No active project found for repository",
        errorDetails: ["Repository must be associated with an active project before syncing issues"]
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
        
        const response: IssueQueryResponse = await this.client.query<IssueQueryResponse>(
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
        );

        const issuesData: IssueQueryResponse["repository"]["issues"] | undefined = response.repository?.issues;
        if (!issuesData) {
          throw new Error("Failed to fetch issues from GitHub");
        }

        totalCount = issuesData.totalCount;
        const issues = issuesData.nodes || [];

        // Process each issue
        for (const issue of issues) {
          try {
            const result = await this.syncSingleIssue(
              repository,
              issue,
              project.id
            );

            processed++;
            if (result.created) created++;
            if (result.updated) updated++;

            // Report progress
            if (onProgress) {
              onProgress({
                total: totalCount,
                processed,
                created,
                updated,
                errors,
                currentPage,
                message: `Processing issue #${issue.number}: ${issue.title}`
              });
            }
          } catch (error) {
            errors++;
            const errorMessage = `Failed to sync issue #${issue.number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errorDetails.push(errorMessage);
            console.error(`[Sync] ${errorMessage}`, error);

            // Report error in progress
            if (onProgress) {
              onProgress({
                total: totalCount,
                processed,
                created,
                updated,
                errors,
                currentPage,
                message: errorMessage
              });
            }
          }
        }

        // Check for next page
        cursor = issuesData.pageInfo.hasNextPage ? issuesData.pageInfo.endCursor : null;

      } while (cursor);

      // Update sync status
      await this.updateRepositorySyncStatus(repository.id, "synced", new Date());

      // Generate summary
      const summary = generateSyncSummary(processed, created, updated, errors);

      // Log sync activity
      await this.logSyncActivity(repository.id, summary, {
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
   * Sync a single issue
   */
  private async syncSingleIssue(
    repository: RepositoryInfo,
    issue: GitHubIssue,
    projectId: string
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
          original_description: syncData.original_description,
          status: syncData.status,
          assigned_to: syncData.assigned_to,
          priority,
          updated_at: syncData.updated_at,
          completed_at: syncData.completed_at,
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
          project_id: projectId,
          repository_id: repository.id,
          github_issue_number: syncData.github_issue_number,
          github_issue_id: syncData.github_issue_id,
          title: syncData.title,
          original_description: syncData.original_description,
          status: syncData.status,
          priority,
          assigned_to: syncData.assigned_to,
          created_by: await this.getSystemUserId(),
          created_at: issue.createdAt,
          updated_at: syncData.updated_at,
          completed_at: syncData.completed_at,
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
   * Update repository sync status
   */
  private async updateRepositorySyncStatus(
    repositoryId: string,
    status: "syncing" | "synced" | "error",
    lastSyncedAt?: Date
  ) {
    const updates: any = { sync_status: status };
    if (lastSyncedAt) {
      updates.last_synced_at = lastSyncedAt.toISOString();
    }

    await this.getSupabase()
      .from("repositories")
      .update(updates)
      .eq("id", repositoryId);
  }

  /**
   * Log sync activity
   */
  private async logSyncActivity(
    repositoryId: string,
    description: string,
    metadata: any
  ) {
    const { data: repository } = await this.getSupabase()
      .from("repositories")
      .select("organization_id")
      .eq("id", repositoryId)
      .single();

    if (!repository) return;

    await this.getSupabase()
      .from("activities")
      .insert({
        organization_id: repository.organization_id,
        user_id: await this.getSystemUserId(),
        type: "webhook_received",
        description: `Issue sync: ${description}`,
        metadata: {
          repository_id: repositoryId,
          sync_type: "issues",
          ...metadata
        }
      });
  }
}