import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DisconnectRepositoryRequest {
  workspace_id: string;
  repository_ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DisconnectRepositoryRequest = await request.json();
    const { workspace_id, repository_ids } = body;

    if (!workspace_id || !repository_ids || repository_ids.length === 0) {
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

    const { data: deletedRepos, error: deleteError } = await supabase
      .from("repositories")
      .delete()
      .eq("workspace_id", workspace_id)
      .in("id", repository_ids)
      .select();

    if (deleteError) {
      console.error("Error disconnecting repositories:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect repositories" },
        { status: 500 },
      );
    }

    // Activities table doesn't exist in new schema, skip logging

    return NextResponse.json({
      message: "Repositories disconnected successfully",
      disconnected: deletedRepos?.length || 0,
    });
  } catch (error) {
    console.error("Error disconnecting repositories:", error);
    return NextResponse.json(
      { error: "Failed to disconnect repositories" },
      { status: 500 },
    );
  }
}
