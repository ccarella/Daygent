import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerGitHubGraphQLClient } from "@/lib/github/github.graphql.server";
import { GitHubSyncService } from "@/services/sync/githubSync.service";
import { RepositoryWithGitHub, SyncJobOptions } from "@/services/sync/types";
import { z } from "zod";

// Request body schema
const syncRequestSchema = z.object({
  states: z.array(z.enum(["OPEN", "CLOSED"])).optional(),
  since: z.string().datetime().optional(),
  batchSize: z.number().min(1).max(100).optional(),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const repositoryId = params.id;
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = syncRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { states, since, batchSize } = validationResult.data;

    // Check repository access and get repository details
    const { data: repository, error: repoError } = await supabase
      .from("repositories")
      .select(`
        *,
        organizations!inner(
          organization_members!inner(*)
        )
      `)
      .eq("id", repositoryId)
      .eq("organizations.organization_members.user_id", user.id)
      .single();

    if (repoError || !repository) {
      return NextResponse.json(
        { error: "Repository not found or access denied" },
        { status: 404 }
      );
    }

    // Check if user has admin/owner role
    const memberRole = repository.organizations.organization_members[0]?.role;
    if (!memberRole || !["admin", "owner"].includes(memberRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin or owner role required." },
        { status: 403 }
      );
    }

    // Check if a sync is already running
    if (repository.sync_status === "syncing") {
      return NextResponse.json(
        { error: "Sync already in progress" },
        { status: 409 }
      );
    }

    // Create sync job
    const { data: syncJob, error: jobError } = await supabase
      .from("sync_jobs")
      .insert({
        repository_id: repositoryId,
        type: "issues",
        status: "running",
        created_by: user.id,
        metadata: { states, since, batchSize }
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      console.error("[Sync API] Failed to create sync job:", jobError);
      return NextResponse.json(
        { error: "Failed to start sync job" },
        { status: 500 }
      );
    }

    // Start sync in background (don't wait for completion)
    performSync(repository, syncJob.id, {
      states,
      since: since ? new Date(since) : undefined,
      batchSize
    }).catch(error => {
      console.error("[Sync API] Background sync failed:", error);
    });

    return NextResponse.json({
      message: "Sync job started",
      jobId: syncJob.id,
      status: "running",
      checkStatusUrl: `/api/repositories/${repositoryId}/sync/status?jobId=${syncJob.id}`
    });

  } catch (error) {
    console.error("[Sync API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Perform sync in background
async function performSync(
  repository: RepositoryWithGitHub,
  jobId: string,
  options: SyncJobOptions
) {
  const supabase = await createClient();
  
  try {
    // Create GitHub client
    const githubClient = await getServerGitHubGraphQLClient();
    if (!githubClient) {
      throw new Error("Failed to create GitHub client");
    }

    // Initialize sync service
    const syncService = new GitHubSyncService(githubClient);
    await syncService.initialize();

    // Perform sync
    const result = await syncService.syncRepositoryIssues(
      {
        id: repository.id,
        organization_id: repository.organization_id,
        github_id: repository.github_id,
        github_name: repository.github_name,
        github_owner: repository.github_owner,
      },
      {
        ...options,
        onProgress: async (progress) => {
          // Update job progress
          await supabase
            .from("sync_jobs")
            .update({
              issues_processed: progress.processed,
              issues_created: progress.created,
              issues_updated: progress.updated,
              errors: progress.errors,
              metadata: {
                ...options,
                lastProgress: progress
              }
            })
            .eq("id", jobId);
        }
      }
    );

    // Update job status
    await supabase
      .from("sync_jobs")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        issues_processed: result.issuesProcessed,
        issues_created: result.created,
        issues_updated: result.updated,
        errors: result.errors,
        error_details: result.errorDetails,
        metadata: {
          ...options,
          summary: result.summary
        }
      })
      .eq("id", jobId);

  } catch (error) {
    // Update job status on error
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_details: [error instanceof Error ? error.message : "Unknown error"],
      })
      .eq("id", jobId);
    
    throw error;
  }
}