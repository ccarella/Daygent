import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  console.log("[Auth Callback] Starting OAuth callback processing...");
  console.log("[Auth Callback] Timestamp:", new Date().toISOString());

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/issues";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  console.log("[Auth Callback] Request details:", {
    hasCode: !!code,
    codeLength: code?.length || 0,
    next: next,
    hasError: !!errorParam,
    error: errorParam,
    errorDescription: errorDescription,
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
  });

  if (errorParam) {
    console.error("[Auth Callback] OAuth error received:", errorParam);
    console.error("[Auth Callback] Error description:", errorDescription);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || errorParam)}`,
        requestUrl.origin,
      ),
    );
  }

  if (code) {
    console.log("[Auth Callback] Creating Supabase client...");
    const clientStartTime = performance.now();
    const supabase = await createClient();
    const clientTime = performance.now() - clientStartTime;
    console.log(
      `[Auth Callback] Supabase client created in ${clientTime.toFixed(2)}ms`,
    );

    console.log("[Auth Callback] Exchanging code for session...");
    const exchangeStartTime = performance.now();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const exchangeTime = performance.now() - exchangeStartTime;
    console.log(
      `[Auth Callback] Code exchange completed in ${exchangeTime.toFixed(2)}ms`,
    );

    if (error) {
      console.error(
        "[Auth Callback] Error exchanging code for session:",
        error,
      );
      console.error("[Auth Callback] Exchange error details:", {
        message: error.message,
        name: error.name,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
      });
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
      console.log("[Auth Callback] User email:", data.user.email);
      console.log("[Auth Callback] User metadata:", {
        provider: data.user.app_metadata?.provider,
        providers: data.user.app_metadata?.providers,
        metadataKeys: Object.keys(data.user.user_metadata || {}),
      });

      const githubUsername =
        data.user.user_metadata?.user_name ||
        data.user.user_metadata?.preferred_username;
      const avatarUrl = data.user.user_metadata?.avatar_url;

      console.log("[Auth Callback] Extracted GitHub data:", {
        githubUsername: githubUsername || "Not found",
        avatarUrl: avatarUrl ? "Present" : "Not found",
        providerId: data.user.user_metadata?.provider_id || "Not found",
      });

      // Use service role client to bypass RLS for user creation
      console.log("[Auth Callback] Creating service role client...");
      const serviceStartTime = performance.now();
      const serviceSupabase = await createServiceRoleClient();
      const serviceTime = performance.now() - serviceStartTime;
      console.log(
        `[Auth Callback] Service role client created in ${serviceTime.toFixed(2)}ms`,
      );

      console.log("[Auth Callback] Upserting user profile...");
      const upsertStartTime = performance.now();
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
      const upsertTime = performance.now() - upsertStartTime;
      console.log(
        `[Auth Callback] User upsert completed in ${upsertTime.toFixed(2)}ms`,
      );

      if (upsertError) {
        console.error(
          "[Auth Callback] Error upserting user data:",
          upsertError,
        );
        console.error("[Auth Callback] Upsert error details:", {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });
        console.error("[Auth Callback] User data attempted:", {
          id: data.user.id,
          email: data.user.email,
          github_id: data.user.user_metadata?.provider_id,
          github_username: githubUsername,
        });
      } else {
        console.log("[Auth Callback] User profile upserted successfully");
      }

      console.log("[Auth Callback] Checking for default organization...");
      const orgStartTime = performance.now();
      const defaultOrgResult = await serviceSupabase
        .from("organizations")
        .select("id")
        .eq("name", "Default Organization")
        .single();
      const orgTime = performance.now() - orgStartTime;
      console.log(
        `[Auth Callback] Organization query completed in ${orgTime.toFixed(2)}ms`,
      );

      if (defaultOrgResult.data) {
        console.log(
          "[Auth Callback] Default organization found:",
          defaultOrgResult.data.id,
        );
        console.log("[Auth Callback] Adding user to organization...");
        const memberStartTime = performance.now();
        const memberResult = await serviceSupabase
          .from("organization_members")
          .upsert({
            user_id: data.user.id,
            organization_id: defaultOrgResult.data.id,
            role: "member",
          })
          .select();
        const memberTime = performance.now() - memberStartTime;
        console.log(
          `[Auth Callback] Organization membership upsert completed in ${memberTime.toFixed(2)}ms`,
        );

        if (memberResult.error) {
          console.error(
            "[Auth Callback] Error adding user to organization:",
            memberResult.error,
          );
        } else {
          console.log(
            "[Auth Callback] User added to organization successfully",
          );
        }
      } else {
        console.warn("[Auth Callback] Default organization not found");
        if (defaultOrgResult.error) {
          console.error(
            "[Auth Callback] Organization query error:",
            defaultOrgResult.error,
          );
        }
      }
    }

    if (!error) {
      const totalTime = performance.now() - startTime;
      console.log(
        `[Auth Callback] Callback processing completed in ${totalTime.toFixed(2)}ms`,
      );
      console.log("[Auth Callback] Redirecting to:", next);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  const totalTime = performance.now() - startTime;
  console.error(
    `[Auth Callback] No code provided in callback after ${totalTime.toFixed(2)}ms`,
  );
  return NextResponse.redirect(
    new URL(`/login?error=auth_callback_error`, requestUrl.origin),
  );
}
