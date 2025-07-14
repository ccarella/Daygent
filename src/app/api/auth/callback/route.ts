import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        new URL("/login?error=auth_failed", requestUrl.origin),
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return NextResponse.redirect(
        new URL("/login?error=user_failed", requestUrl.origin),
      );
    }

    // Check if user profile exists and is completed
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    // Determine redirect based on user state
    if (!profile || !profile.profile_completed) {
      // New user or incomplete profile - needs profile setup
      return NextResponse.redirect(
        new URL("/onboarding/profile", requestUrl.origin),
      );
    }

    // Check if user has any workspaces
    const { data: workspaceMembers } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaceMembers || workspaceMembers.length === 0) {
      // Existing user but no workspace
      return NextResponse.redirect(
        new URL("/onboarding/workspace", requestUrl.origin),
      );
    }

    // Get the workspace details
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceMembers[0].workspace_id)
      .single();

    const workspaceSlug = workspace?.slug;

    if (!workspaceSlug) {
      // Fallback if workspace data is missing
      return NextResponse.redirect(
        new URL("/onboarding/workspace", requestUrl.origin),
      );
    }

    // User has workspace(s) - redirect to workspace issues page or intended destination
    const redirectTo = next === "/" ? `/${workspaceSlug}/issues` : next;
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  }

  // No code provided
  return NextResponse.redirect(
    new URL("/login?error=no_code", requestUrl.origin),
  );
}
