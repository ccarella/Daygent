import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const repositoryId = params.id;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check repository access
    const { data: repository, error: repoError } = await supabase
      .from("repositories")
      .select(`
        id,
        sync_status,
        last_synced_at,
        sync_error,
        organizations!inner(
          organization_members!inner(user_id)
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

    // If jobId is provided, get specific job status
    if (jobId) {
      const { data: syncJob, error: jobError } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("repository_id", repositoryId)
        .single();

      if (jobError || !syncJob) {
        return NextResponse.json(
          { error: "Sync job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        jobId: syncJob.id,
        status: syncJob.status,
        type: syncJob.type,
        startedAt: syncJob.started_at,
        completedAt: syncJob.completed_at,
        progress: {
          processed: syncJob.issues_processed,
          created: syncJob.issues_created,
          updated: syncJob.issues_updated,
          errors: syncJob.errors
        },
        errorDetails: syncJob.error_details,
        metadata: syncJob.metadata
      });
    }

    // Get recent sync jobs
    const { data: recentJobs } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("repository_id", repositoryId)
      .order("started_at", { ascending: false })
      .limit(5);

    // Get issue count
    const { count: issueCount } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("repository_id", repositoryId);

    return NextResponse.json({
      repository: {
        id: repository.id,
        syncStatus: repository.sync_status,
        lastSyncedAt: repository.last_synced_at,
        syncError: repository.sync_error,
        issueCount: issueCount || 0
      },
      recentJobs: recentJobs?.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        issuesProcessed: job.issues_processed,
        issuesCreated: job.issues_created,
        issuesUpdated: job.issues_updated,
        errors: job.errors
      })) || []
    });

  } catch (error) {
    console.error("[Sync Status API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}