import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { workspace_id } = await request.json();

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user has access to this workspace
    const { data: memberData, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You don't have access to this workspace" },
        { status: 403 }
      );
    }

    // Generate CSRF token for state parameter
    const csrfToken = crypto.randomBytes(16).toString("hex");
    const state = `${workspace_id}:${csrfToken}`;

    // Construct the GitHub App installation URL
    const githubAppInstallUrl = `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new?state=${encodeURIComponent(state)}`;

    return NextResponse.json({
      install_url: githubAppInstallUrl,
      state,
    });
  } catch (error) {
    console.error("GitHub App installation initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate GitHub App installation" },
      { status: 500 }
    );
  }
}