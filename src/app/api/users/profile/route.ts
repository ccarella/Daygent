import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { name, avatar_url } = body;

    // First check if user profile exists
    // Use maybeSingle() to avoid errors when no profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("Error checking for existing profile:", profileCheckError);
      console.error("Profile check error details:", {
        code: profileCheckError.code,
        message: profileCheckError.message,
        details: profileCheckError.details,
        hint: profileCheckError.hint,
        userId: user.id,
      });
    }

    let data;
    let error;

    if (!existingProfile) {
      // Create profile if it doesn't exist
      ({ data, error } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email!,
          name,
          avatar_url,
          profile_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single());
    } else {
      // Update existing profile
      ({ data, error } = await supabase
        .from("users")
        .update({
          name,
          avatar_url,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single());
    }

    if (error) {
      console.error("Error updating profile:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
        userEmail: user.email,
        existingProfile: !!existingProfile,
        operation: existingProfile ? "update" : "insert",
        requestBody: { name, avatar_url },
      });

      // Provide more context in error response
      const errorMessage =
        error.code === "42501"
          ? "Permission denied. RLS policy violation."
          : error.message || "Failed to update profile";

      return NextResponse.json(
        {
          error: errorMessage,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
