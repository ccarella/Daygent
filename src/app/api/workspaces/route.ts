import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

// POST /api/workspaces - Create new workspace
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createWorkspaceSchema.parse(body);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if slug is available
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", validatedData.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Workspace slug already taken" },
        { status: 400 }
      );
    }

    // Create workspace using database function
    const { data: workspaceId, error } = await supabase
      .rpc("create_workspace_with_member", {
        p_name: validatedData.name,
        p_slug: validatedData.slug,
        p_user_id: user.id,
      });

    if (error) throw error;

    // Fetch the created workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}

// GET /api/workspaces - List user's workspaces
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        workspaces (
          id,
          name,
          slug,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", user.id);

    if (error) throw error;

    const workspaces = members?.map(m => m.workspaces).filter(Boolean) || [];

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}