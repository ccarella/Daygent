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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-my-custom-header': 'daygent-api',
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

    // Create organization using database function that bypasses RLS
    console.log("Creating organization with data:", { name, slug, description });
    
    const { data: orgData, error: orgError } = await serviceRoleClient.rpc(
      'create_organization_with_owner',
      {
        p_name: name,
        p_slug: slug,
        p_description: description || null,
        p_user_id: user.id,
      }
    );

    const organization = orgData?.[0];

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

    // The database function already handles:
    // 1. Creating the organization
    // 2. Adding the user as owner
    // 3. Logging the activity
    // So we can just return the result

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error in organization creation:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}