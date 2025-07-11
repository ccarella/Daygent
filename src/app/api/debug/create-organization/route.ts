import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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

    // Check if user already has organizations
    const { data: existingOrgs } = await serviceClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    if (existingOrgs && existingOrgs.length > 0) {
      return NextResponse.json(
        { error: "User already has organizations" },
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
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) break;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create organization
    const orgName =
      userProfile.name ||
      userProfile.github_username ||
      userProfile.email.split("@")[0];

    const { data: newOrg, error: createError } = await serviceClient
      .from("organizations")
      .insert({
        name: orgName,
        slug: slug,
        subscription_status: "trial",
        trial_ends_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        seats_used: 1,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create organization: ${createError.message}` },
        { status: 400 },
      );
    }

    // Add user as owner
    const { error: memberError } = await serviceClient
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      return NextResponse.json(
        { error: `Failed to add user as owner: ${memberError.message}` },
        { status: 400 },
      );
    }

    // Log activity
    await serviceClient.from("activities").insert({
      organization_id: newOrg.id,
      user_id: user.id,
      type: "member_joined",
      description: `Organization created for existing user ${userProfile.email}`,
    });

    return NextResponse.json({
      success: true,
      organization: newOrg,
      message: `Successfully created organization "${orgName}" with slug "${slug}"`,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
