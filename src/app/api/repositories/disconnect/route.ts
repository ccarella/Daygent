import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DisconnectRepositoryRequest {
  organization_id: string;
  repository_ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DisconnectRepositoryRequest = await request.json();
    const { organization_id, repository_ids } = body;

    if (!organization_id || !repository_ids || repository_ids.length === 0) {
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
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const { data: deletedRepos, error: deleteError } = await supabase
      .from("repositories")
      .delete()
      .eq("organization_id", organization_id)
      .in("id", repository_ids)
      .select();

    if (deleteError) {
      console.error("Error disconnecting repositories:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect repositories" },
        { status: 500 },
      );
    }

    const { error: activityError } = await supabase.from("activities").insert({
      organization_id,
      user_id: user.id,
      type: "repository_connected",
      description: "repositories.disconnected",
      metadata: {
        count: deletedRepos?.length || 0,
        repository_names:
          deletedRepos?.map((r: { full_name: string }) => r.full_name) || [],
      },
    });

    if (activityError) {
      console.error("Error creating activity log:", activityError);
    }

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
