import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CreateWorkspaceRequest {
  name: string;
  slug: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkspaceRequest = await request.json();
    const { name, slug } = body;

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
    const { data: existingWorkspace } = await serviceRoleClient
      .from("workspaces")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (existingWorkspace) {
      return NextResponse.json(
        { error: "Workspace slug is already taken" },
        { status: 400 }
      );
    }

    // Create workspace using database function that bypasses RLS
    console.log("Creating workspace with data:", { name, slug });
    
    const { data: workspaceId, error: workspaceError } = await serviceRoleClient.rpc(
      'create_workspace_with_member',
      {
        p_name: name,
        p_slug: slug,
        p_user_id: user.id,
      }
    );

    if (workspaceError || !workspaceId) {
      console.error("Error creating workspace:", workspaceError);
      console.error("Workspace creation failed - Details:", {
        error: workspaceError,
        errorMessage: workspaceError?.message,
        errorDetails: workspaceError?.details,
        errorHint: workspaceError?.hint,
        errorCode: workspaceError?.code,
      });
      return NextResponse.json(
        { 
          error: "Failed to create workspace",
          details: workspaceError?.message || "Unknown error",
          code: workspaceError?.code,
        },
        { status: 500 }
      );
    }

    // Get the created workspace
    const { data: workspace, error: fetchError } = await serviceRoleClient
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (fetchError || !workspace) {
      console.error("Error fetching created workspace:", fetchError);
      return NextResponse.json(
        { error: "Workspace created but failed to fetch details" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Error in workspace creation:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}