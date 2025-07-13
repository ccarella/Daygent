import { NextRequest, NextResponse } from "next/server";
import { getServerGitHubService } from "@/services/github.server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const per_page = parseInt(searchParams.get("per_page") || "30", 10);
    const search = searchParams.get("search") || "";
    const visibility =
      (searchParams.get("visibility") as "all" | "public" | "private") || "all";

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const githubService = await getServerGitHubService();

    if (!githubService) {
      return NextResponse.json(
        { error: "GitHub service not available. Please re-authenticate." },
        { status: 401 },
      );
    }

    let response;

    if (search) {
      response = await githubService.searchRepositories(search, {
        page,
        per_page,
      });
    } else {
      response = await githubService.listUserRepositories({
        page,
        per_page,
        visibility,
      });
    }

    const { data: connectedRepos } = await supabase
      .from("repositories")
      .select("github_id")
      .eq("workspace_id", searchParams.get("workspace_id") || "");

    const connectedGitHubIds = new Set(
      connectedRepos?.map((repo: { github_id: number }) => repo.github_id) ||
        [],
    );

    const repositoriesWithConnectionStatus = response.repositories.map(
      (repo) => ({
        ...repo,
        is_connected: connectedGitHubIds.has(repo.id),
      }),
    );

    return NextResponse.json({
      repositories: repositoriesWithConnectionStatus,
      pagination: response.pagination,
    });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 },
    );
  }
}
