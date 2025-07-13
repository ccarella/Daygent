import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

export async function POST() {
  try {
    // Get the current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use service role client for admin operations
    const serviceClient = await createServiceRoleClient();

    // Get user profile
    const { data: userProfile, error: profileError } = await serviceClient
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 400 },
      );
    }

    // Check if user already has workspaces
    const { data: existingWorkspaces } = await serviceClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (existingWorkspaces && existingWorkspaces.length > 0) {
      return NextResponse.json(
        { error: "User already has workspaces" },
        { status: 400 },
      );
    }

    // Generate slug
    let baseSlug = "";
    if (userProfile.github_username) {
      baseSlug = userProfile.github_username
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
    } else {
      const emailPart = userProfile.email.split("@")[0];
      baseSlug = emailPart.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    baseSlug = baseSlug.replace(/^-+|-+$/g, "");
    if (!baseSlug) {
      baseSlug = "user";
    }

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const { data: existing } = await serviceClient
        .from("workspaces")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) break;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create workspace
    const workspaceName =
      userProfile.name ||
      userProfile.github_username ||
      userProfile.email.split("@")[0];

    // Create workspace directly - service role should bypass RLS
    const { data: newWorkspace, error: createError } = await serviceClient
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug: slug,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create workspace:", createError);
      return NextResponse.json(
        { error: `Failed to create workspace: ${createError.message}` },
        { status: 400 },
      );
    }

    // Add user as member
    let memberAdded = false;
    let memberError: PostgrestError | null = null;

    // Direct insert with service role
    const { error: directError } = await serviceClient
      .from("workspace_members")
      .insert({
        workspace_id: newWorkspace.id,
        user_id: user.id,
        joined_at: new Date().toISOString(),
      });

    if (!directError) {
      memberAdded = true;
    } else {
      memberError = directError;
      console.error("Direct member insert failed:", directError);
    }

    if (!memberAdded) {
      // Clean up: delete the workspace if we can't add the member
      await serviceClient.from("workspaces").delete().eq("id", newWorkspace.id);

      return NextResponse.json(
        {
          error: `Workspace creation incomplete due to database policy restrictions. ${
            memberError ? `Error: ${memberError.message}` : ""
          }. Please contact support or run database migrations.`,
        },
        { status: 400 },
      );
    }

    // Activities table doesn't exist in new schema, skip logging

    return NextResponse.json({
      success: true,
      workspace: {
        id: newWorkspace.id,
        name: newWorkspace.name,
        slug: newWorkspace.slug,
      },
      message: `Successfully created workspace "${newWorkspace.name}" with slug "${newWorkspace.slug}"`,
    });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
