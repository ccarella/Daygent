import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { available: false, error: "Invalid slug format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if slug already exists
    const { data: existingWorkspace, error } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Error checking workspace slug:", error);
      return NextResponse.json(
        { error: "Failed to check slug availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({ available: !existingWorkspace });
  } catch (error) {
    console.error("Error in workspace slug check:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}