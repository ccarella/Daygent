import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrganizationRequest = await request.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      console.error("Available env vars:", Object.keys(process.env).filter(key => key.includes('SUPABASE')).sort());
      return NextResponse.json(
        { error: "Server configuration error: Service role key missing" },
        { status: 500 }
      );
    }

    // Log service role key info (first few chars only for security)
    console.log("Service role key present, starts with:", process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + "...");

    // Create a service role client to bypass RLS
    const cookieStore = await cookies();
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      }
    );

    // Check if slug is already taken
    const { data: existingOrg } = await serviceRoleClient
      .from("organizations")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization slug is already taken" },
        { status: 400 }
      );
    }

    // Create organization
    console.log("Creating organization with data:", { name, slug, description, plan: "free" });
    
    const { data: organization, error: orgError } = await serviceRoleClient
      .from("organizations")
      .insert({
        name,
        slug,
        description: description || null,
        plan: "free",
      })
      .select()
      .single();

    if (orgError || !organization) {
      console.error("Error creating organization:", orgError);
      console.error("Organization creation failed - Details:", {
        error: orgError,
        errorMessage: orgError?.message,
        errorDetails: orgError?.details,
        errorHint: orgError?.hint,
        errorCode: orgError?.code,
      });
      return NextResponse.json(
        { 
          error: "Failed to create organization",
          details: orgError?.message || "Unknown error",
          code: orgError?.code,
        },
        { status: 500 }
      );
    }

    // Add the user as owner
    const { error: memberError } = await serviceRoleClient
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Error adding user as owner:", memberError);
      // Clean up - delete the organization if we can't add the owner
      await serviceRoleClient
        .from("organizations")
        .delete()
        .eq("id", organization.id);

      return NextResponse.json(
        { error: "Failed to add user as organization owner" },
        { status: 500 }
      );
    }

    // Log activity
    await serviceRoleClient.from("activities").insert({
      organization_id: organization.id,
      user_id: user.id,
      action: "organization.created",
      resource_type: "organization",
      resource_id: organization.id,
      metadata: {
        organization_name: name,
        organization_slug: slug,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error in organization creation:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}