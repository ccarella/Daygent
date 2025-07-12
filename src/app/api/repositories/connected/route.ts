import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organization_id = searchParams.get("organization_id");

    if (!organization_id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a member of the organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    // Fetch connected repositories for the organization
    const { data: repositories, error: repoError } = await supabase
      .from("repositories")
      .select("id, name, full_name, description:full_name")
      .eq("organization_id", organization_id)
      .order("name", { ascending: true });

    if (repoError) {
      console.error("Error fetching connected repositories:", repoError);
      return NextResponse.json(
        { error: "Failed to fetch repositories" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      repositories: repositories || [],
    });
  } catch (error) {
    console.error("Error in connected repositories endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch connected repositories" },
      { status: 500 },
    );
  }
}