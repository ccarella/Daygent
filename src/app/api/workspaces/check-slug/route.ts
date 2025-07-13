import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    
    if (!slug || slug.length < 3) {
      return NextResponse.json(
        { error: "Slug must be at least 3 characters long" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .single();

    return NextResponse.json({ available: !data });
  } catch (error) {
    console.error("Failed to check slug availability:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}