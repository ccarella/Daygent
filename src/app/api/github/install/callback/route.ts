import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGitHubAppConfig } from "@/lib/github-app/config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!installationId || !code || !state) {
    return NextResponse.redirect(
      new URL("/settings/github?error=missing_params", request.url)
    );
  }

  try {
    const supabase = await createClient();
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verify the state parameter (should contain workspace ID)
    const [workspaceId] = state.split(":");
    
    // Verify workspace membership
    const { data: sessionData } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!sessionData) {
      return NextResponse.redirect(
        new URL("/settings/github?error=invalid_workspace", request.url)
      );
    }

    // Exchange the code for an access token
    const config = getGitHubAppConfig();
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for token:", await tokenResponse.text());
      return NextResponse.redirect(
        new URL("/settings/github?error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token in response:", tokenData);
      return NextResponse.redirect(
        new URL("/settings/github?error=no_access_token", request.url)
      );
    }

    // Get installation details
    const installationResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!installationResponse.ok) {
      console.error("Failed to get installation details:", await installationResponse.text());
      return NextResponse.redirect(
        new URL("/settings/github?error=installation_fetch_failed", request.url)
      );
    }

    const installationData = await installationResponse.json();

    // Store the installation in the database
    const { error: insertError } = await supabase
      .from("github_installations")
      .upsert({
        workspace_id: workspaceId,
        installation_id: parseInt(installationId),
        github_account_name: installationData.account.login,
        github_account_type: installationData.account.type,
        installed_by: user.id,
        installed_at: new Date().toISOString(),
      }, {
        onConflict: "installation_id",
      });

    if (insertError) {
      console.error("Failed to store installation:", insertError);
      return NextResponse.redirect(
        new URL("/settings/github?error=storage_failed", request.url)
      );
    }

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL("/settings/github?success=true", request.url)
    );
  } catch (error) {
    console.error("GitHub App installation callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/github?error=unexpected", request.url)
    );
  }
}