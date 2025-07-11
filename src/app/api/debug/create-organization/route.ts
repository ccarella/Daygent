import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

interface DebugOrgResult {
  id: string | null;
  name: string | null;
  slug: string | null;
  success: boolean;
  message: string;
}

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

    // Use the debug function to create organization and bypass RLS issues
    const { data: result, error: createError } = await serviceClient
      .rpc('create_organization_for_user_debug', {
        p_user_id: user.id,
        p_org_name: orgName,
        p_org_slug: slug,
      })
      .single() as { data: DebugOrgResult | null; error: any };

    if (createError) {
      console.error("Function error:", createError);
      return NextResponse.json(
        { error: `Failed to create organization: ${createError.message}` },
        { status: 400 },
      );
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.message || "Failed to create organization" },
        { status: 400 },
      );
    }

    if (!result.id || !result.name || !result.slug) {
      return NextResponse.json(
        { error: "Organization created but missing data" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
      },
      message: `Successfully created organization "${result.name}" with slug "${result.slug}"`,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
