import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspace_id = searchParams.get("workspace_id");

    if (!workspace_id) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
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

    // Verify user is a member of the workspace
    const { data: memberData, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 },
      );
    }

    // Fetch connected repositories for the workspace
    const { data: repositories, error: repoError } = await supabase
      .from("repositories")
      .select("id, name, full_name")
      .eq("workspace_id", workspace_id)
      .order("name", { ascending: true });

    if (repoError) {
      console.error("Error fetching connected repositories:", repoError);
      return NextResponse.json(
        { error: "Failed to fetch repositories" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      repositories: repositories || [],
    });
  } catch (error) {
    console.error("Error in connected repositories endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch connected repositories" },
      { status: 500 },
    );
  }
}