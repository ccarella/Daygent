import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  console.log(
    "[Auth Callback] Processing callback with code:",
    code ? "present" : "missing",
  );

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "[Auth Callback] Error exchanging code for session:",
        error,
      );
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!error && data.user) {
      console.log(
        "[Auth Callback] Successfully authenticated user:",
        data.user.id,
      );

      const githubUsername =
        data.user.user_metadata?.user_name ||
        data.user.user_metadata?.preferred_username;
      const avatarUrl = data.user.user_metadata?.avatar_url;

      // Use service role client to bypass RLS for user creation
      const serviceSupabase = await createServiceRoleClient();
      console.log("[Auth Callback] Using service role client for user upsert");

      const { error: upsertError } = await serviceSupabase
        .from("users")
        .upsert({
          id: data.user.id,
          email: data.user.email,
          github_id: data.user.user_metadata?.provider_id,
          github_username: githubUsername,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) {
        console.error(
          "[Auth Callback] Error upserting user data:",
          upsertError,
        );
        console.error("[Auth Callback] User data attempted:", {
          id: data.user.id,
          email: data.user.email,
          github_id: data.user.user_metadata?.provider_id,
          github_username: githubUsername,
        });
      } else {
        console.log("[Auth Callback] User profile upserted successfully");
      }

      const defaultOrgResult = await serviceSupabase
        .from("organizations")
        .select("id")
        .eq("name", "Default Organization")
        .single();

      if (defaultOrgResult.data) {
        await serviceSupabase
          .from("organization_members")
          .upsert({
            user_id: data.user.id,
            organization_id: defaultOrgResult.data.id,
            role: "member",
          })
          .select();
      }
    }

    if (!error) {
      console.log("[Auth Callback] Redirecting to:", next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  console.error("[Auth Callback] No code provided in callback");
  return NextResponse.redirect(
    new URL(`/login?error=auth_callback_error`, requestUrl.origin),
  );
}
