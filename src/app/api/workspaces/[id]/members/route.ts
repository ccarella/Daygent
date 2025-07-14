import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const inviteMemberSchema = z.object({
  email: z.string().email(),
});

// GET /api/workspaces/[id]/members - List workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is member of workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get all members
    const { data: members, error } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        created_at,
        users (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("workspace_id", id);

    if (error) throw error;

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Failed to fetch workspace members:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace members" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/members - Invite member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is member of workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = inviteMemberSchema.parse(body);

    // Find user by email
    const { data: invitedUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", validatedData.email)
      .single();

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found. They must sign up first." },
        { status: 404 }
      );
    }

    // Check if already member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", id)
      .eq("user_id", invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 400 }
      );
    }

    // Add member
    const { error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: id,
        user_id: invitedUser.id,
      });

    if (error) throw error;

    return NextResponse.json(
      { message: "Member invited successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to invite member:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/members/[userId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const url = new URL(request.url);
    const userIdToRemove = url.pathname.split('/').pop();

    if (!user || !userIdToRemove) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is member
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check workspace ownership if removing someone else
    if (userIdToRemove !== user.id) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("created_by")
        .eq("id", id)
        .single();

      if (!workspace || workspace.created_by !== user.id) {
        return NextResponse.json(
          { error: "Only workspace creator can remove other members" },
          { status: 403 }
        );
      }
    }

    // Remove member
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", id)
      .eq("user_id", userIdToRemove);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}