import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerGitHubGraphQLClient } from "@/lib/github/github.graphql.server";
import { GitHubSyncService } from "@/services/sync/githubSync.service";
import { RepositoryWithGitHub } from "@/services/sync/types";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const projectId = params.id;
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get project with repository details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        repositories!inner(*),
        repositories!inner(
          organizations!inner(
            organization_members!inner(*)
          )
        )
      `)
      .eq("id", projectId)
      .eq("repositories.organizations.organization_members.user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Check if user has admin/owner role
    const memberRole = project.repositories.organizations.organization_members[0]?.role;
    if (!memberRole || !["admin", "owner"].includes(memberRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin or owner role required." },
        { status: 403 }
      );
    }

    const repository = project.repositories;

    // Check if a sync is already running
    if (repository.sync_status === "syncing") {
      return NextResponse.json(
        { error: "Sync already in progress for this project's repository" },
        { status: 409 }
      );
    }

    // Create sync job
    const { data: syncJob, error: jobError } = await supabase
      .from("sync_jobs")
      .insert({
        repository_id: repository.id,
        type: "issues",
        status: "running",
        created_by: user.id,
        metadata: { 
          project_id: projectId,
          project_name: project.name 
        }
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      console.error("[Project Sync API] Failed to create sync job:", jobError);
      return NextResponse.json(
        { error: "Failed to start sync job" },
        { status: 500 }
      );
    }

    // Start sync in background
    performProjectSync(repository, syncJob.id, projectId).catch(error => {
      console.error("[Project Sync API] Background sync failed:", error);
    });

    return NextResponse.json({
      message: "Project sync started",
      jobId: syncJob.id,
      repositoryId: repository.id,
      status: "running",
      checkStatusUrl: `/api/repositories/${repository.id}/sync/status?jobId=${syncJob.id}`
    });

  } catch (error) {
    console.error("[Project Sync API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Perform sync in background
async function performProjectSync(
  repository: RepositoryWithGitHub,
  jobId: string,
  projectId: string
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

    // Perform sync with default options
    const result = await syncService.syncRepositoryIssues(
      {
        id: repository.id,
        organization_id: repository.organization_id,
        github_id: repository.github_id,
        github_name: repository.github_name,
        github_owner: repository.github_owner,
      },
      {
        states: ["OPEN", "CLOSED"],
        batchSize: 50,
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
                project_id: projectId,
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
          project_id: projectId,
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