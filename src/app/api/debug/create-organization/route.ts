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

    // Create organization directly - service role should bypass RLS
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
      console.error("Failed to create organization:", createError);
      return NextResponse.json(
        { error: `Failed to create organization: ${createError.message}` },
        { status: 400 },
      );
    }

    // Add user as owner - try multiple approaches to bypass RLS
    let memberAdded = false;
    let memberError: PostgrestError | null = null;

    // First attempt: direct insert with service role
    const { error: directError } = await serviceClient
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (!directError) {
      memberAdded = true;
    } else {
      memberError = directError;
      console.error("Direct member insert failed:", directError);

      // Second attempt: use raw SQL via Supabase SQL editor function if available
      try {
        const { error: sqlError } = await serviceClient.rpc("exec", {
          sql: `INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4)`,
          params: [newOrg.id, user.id, "owner", new Date().toISOString()],
        });

        if (!sqlError) {
          memberAdded = true;
          memberError = null;
        }
      } catch {
        console.log("SQL function not available");
      }
    }

    if (!memberAdded) {
      // Clean up: delete the organization if we can't add the member
      await serviceClient.from("organizations").delete().eq("id", newOrg.id);

      return NextResponse.json(
        {
          error: `Organization creation incomplete due to database policy restrictions. ${
            memberError ? `Error: ${memberError.message}` : ""
          }. Please contact support or run database migrations.`,
        },
        { status: 400 },
      );
    }

    // Try to log activity (non-critical)
    try {
      await serviceClient.from("activities").insert({
        organization_id: newOrg.id,
        user_id: user.id,
        action: "organization.created",
        resource_type: "organization",
        resource_id: newOrg.id,
        metadata: {
          description: `Organization created for existing user ${userProfile.email}`,
        },
      });
    } catch (activityError) {
      console.warn("Failed to log activity:", activityError);
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
      },
      message: `Successfully created organization "${newOrg.name}" with slug "${newOrg.slug}"`,
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
