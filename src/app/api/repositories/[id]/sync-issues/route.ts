import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstallationOctokit } from "@/services/github-app.server";
import { z } from "zod";

const syncSchema = z.object({
  full_sync: z.boolean().optional().default(false),
});

// POST /api/repositories/[id]/sync-issues - Sync issues from GitHub
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_sync } = syncSchema.parse(body);

    // Get repository with workspace info
    const { data: repository, error: repoError } = await supabase
      .from("repositories")
      .select(`
        *,
        workspace:workspaces(id)
      `)
      .eq("id", params.id)
      .single();

    if (repoError || !repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Verify user has access
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", repository.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if sync is already in progress
    const { data: syncStatus } = await supabase
      .from("sync_status")
      .select("sync_in_progress")
      .eq("repository_id", params.id)
      .single();

    if (syncStatus?.sync_in_progress) {
      return NextResponse.json(
        { error: "Sync already in progress" },
        { status: 409 }
      );
    }

    // Mark sync as in progress
    await supabase
      .from("sync_status")
      .upsert({
        repository_id: params.id,
        sync_in_progress: true,
      });

    // Start sync process (could be moved to background job)
    const result = await syncRepositoryIssues(
      repository,
      full_sync
    );

    // Update sync status
    await supabase
      .from("sync_status")
      .update({
        sync_in_progress: false,
        last_issue_sync: new Date().toISOString(),
        last_issue_cursor: result.cursor,
      })
      .eq("repository_id", params.id);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      updated: result.updated,
      cursor: result.cursor,
    });
  } catch (error) {
    console.error("Issue sync error:", error);
    
    // Mark sync as failed
    const supabase = await createClient();
    await supabase
      .from("sync_status")
      .update({ sync_in_progress: false })
      .eq("repository_id", params.id);

    return NextResponse.json(
      { error: "Failed to sync issues" },
      { status: 500 }
    );
  }
}

interface SyncRepository {
  id: string;
  workspace_id: string;
  owner: string;
  name: string;
  installation_id: number;
}

async function syncRepositoryIssues(
  repository: SyncRepository,
  fullSync: boolean = false
) {
  const octokit = await getInstallationOctokit(repository.installation_id);
  const supabase = await createClient();
  
  let synced = 0;
  let cursor = null;

  // Get last sync cursor if not doing full sync
  if (!fullSync) {
    const { data: syncStatus } = await supabase
      .from("sync_status")
      .select("last_issue_cursor")
      .eq("repository_id", repository.id)
      .single();
    
    cursor = syncStatus?.last_issue_cursor;
  }

  // Fetch issues from GitHub
  // @ts-expect-error - octokit type from app.getInstallationOctokit doesn't have proper types
  const iterator = octokit.paginate.iterator(
    // @ts-expect-error - octokit type from app.getInstallationOctokit doesn't have proper types
    octokit.rest.issues.listForRepo,
    {
      owner: repository.owner,
      repo: repository.name,
      state: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    }
  );

  for await (const { data: issues } of iterator) {
    for (const issue of issues) {
      // Skip pull requests (they have pull_request property)
      if (issue.pull_request) continue;

      // Check if we've seen this issue before (for incremental sync)
      if (!fullSync && cursor && issue.updated_at <= cursor) {
        break;
      }

      // Upsert issue
      const { error } = await supabase
        .from("issues")
        .upsert({
          repository_id: repository.id,
          workspace_id: repository.workspace_id,
          github_issue_number: issue.number,
          github_issue_id: issue.id,
          github_node_id: issue.node_id,
          title: issue.title,
          body: issue.body || "",
          state: issue.state,
          author_github_login: issue.user?.login,
          assignee_github_login: issue.assignee?.login,
          labels: issue.labels.map((label: { name: string; color: string; description?: string }) => ({
            name: label.name,
            color: label.color,
            description: label.description,
          })),
          github_created_at: issue.created_at,
          github_updated_at: issue.updated_at,
          github_closed_at: issue.closed_at,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to upsert issue:", error);
      } else {
        synced++;
      }
    }

    // Update cursor to latest issue
    if (issues.length > 0) {
      cursor = issues[0].updated_at;
    }
  }

  return { synced, updated: 0, cursor };
}

// GET /api/repositories/[id]/sync-status - Get sync status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get repository to verify access
    const { data: repository } = await supabase
      .from("repositories")
      .select("workspace_id")
      .eq("id", params.id)
      .single();

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Verify user has access
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", repository.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get sync status
    const { data: syncStatus, error } = await supabase
      .from("sync_status")
      .select("*")
      .eq("repository_id", params.id)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is "not found"
      console.error("Error fetching sync status:", error);
      return NextResponse.json({ error: "Failed to fetch sync status" }, { status: 500 });
    }

    return NextResponse.json(syncStatus || {
      sync_in_progress: false,
      last_issue_sync: null,
      last_issue_cursor: null,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json({ error: "Failed to fetch sync status" }, { status: 500 });
  }
}