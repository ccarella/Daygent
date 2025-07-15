import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerGitHubService } from "@/services/github-app.server";
// Repository type for inserting
type InsertRepository = {
  workspace_id: string;
  github_id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
};

interface ConnectRepositoryRequest {
  workspace_id: string;
  repositories: Array<{
    github_id: number;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectRepositoryRequest = await request.json();
    const { workspace_id, repositories } = body;

    if (!workspace_id || !repositories || repositories.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: memberData, error: memberError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 },
      );
    }

    const githubService = await getServerGitHubService(workspace_id);
    if (!githubService) {
      return NextResponse.json(
        {
          error:
            "GitHub not connected. Please connect your GitHub account in settings.",
        },
        { status: 401 },
      );
    }

    const reposToInsert: InsertRepository[] = [];
    const errors: Array<{ repository: string; error: string }> = [];

    for (const repo of repositories) {
      try {
        const fullRepoData = await githubService.getRepository(
          repo.full_name.split("/")[0],
          repo.name,
        );

        if (!fullRepoData) {
          errors.push({
            repository: repo.full_name,
            error: "Repository not found",
          });
          continue;
        }

        reposToInsert.push({
          workspace_id,
          github_id: repo.github_id,
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.full_name.split("/")[0],
          private: repo.private,
          default_branch: repo.default_branch,
        });
      } catch (error) {
        console.error(`Error validating repository ${repo.full_name}:`, error);
        errors.push({
          repository: repo.full_name,
          error: "Failed to validate repository",
        });
      }
    }

    if (reposToInsert.length === 0) {
      return NextResponse.json(
        {
          error: "No valid repositories to connect",
          details: errors,
        },
        { status: 400 },
      );
    }

    const { data: existingRepos } = await supabase
      .from("repositories")
      .select("github_id")
      .eq("workspace_id", workspace_id)
      .in(
        "github_id",
        reposToInsert.map((r) => r.github_id),
      );

    const existingGitHubIds = new Set(
      existingRepos?.map((r: { github_id: number }) => r.github_id) || [],
    );

    const newRepos = reposToInsert.filter(
      (repo) => !existingGitHubIds.has(repo.github_id),
    );

    if (newRepos.length === 0) {
      return NextResponse.json({
        message: "All repositories are already connected",
        connected: 0,
        errors,
      });
    }

    const { data: insertedRepos, error: insertError } = await supabase
      .from("repositories")
      .insert(newRepos)
      .select();

    if (insertError) {
      console.error("Error inserting repositories:", insertError);
      return NextResponse.json(
        { error: "Failed to connect repositories" },
        { status: 500 },
      );
    }

    // Activity tracking removed - activities table no longer exists

    return NextResponse.json({
      message: "Repositories connected successfully",
      connected: insertedRepos?.length || 0,
      repositories: insertedRepos,
      errors,
    });
  } catch (error) {
    console.error("Error connecting repositories:", error);
    return NextResponse.json(
      { error: "Failed to connect repositories" },
      { status: 500 },
    );
  }
}
