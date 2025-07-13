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
      return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return NextResponse.redirect(new URL("/login?error=user_failed", requestUrl.origin));
    }

    // Check if user profile exists
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    // Determine redirect based on user state
    if (!profile) {
      // New user - needs profile setup
      return NextResponse.redirect(new URL("/onboarding/profile", requestUrl.origin));
    }

    // Check if user has any workspaces
    const { data: workspaces } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      // Existing user but no workspace
      return NextResponse.redirect(new URL("/onboarding/workspace", requestUrl.origin));
    }

    // User has workspace(s) - redirect to intended destination or dashboard
    const redirectTo = next === "/" ? "/dashboard" : next;
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  }

  // No code provided
  return NextResponse.redirect(new URL("/login?error=no_code", requestUrl.origin));
}