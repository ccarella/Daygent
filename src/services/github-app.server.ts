import { createClient } from "@/lib/supabase/server";
import { createGitHubService } from "./github.service";
import type { GitHubService } from "./github.service";
import { App } from "@octokit/app";
import { getGitHubAppConfig } from "@/lib/github-app/config";

let appInstance: App | null = null;

function getGitHubApp(): App {
  if (!appInstance) {
    const config = getGitHubAppConfig();

    if (!config.privateKey) {
      throw new Error("GitHub App private key not configured");
    }

    // Decode base64 private key
    const privateKey = Buffer.from(config.privateKey, "base64").toString(
      "utf-8",
    );

    appInstance = new App({
      appId: config.appId,
      privateKey,
    });
  }

  return appInstance;
}

export async function getGitHubAppService(
  workspaceId: string,
): Promise<GitHubService | null> {
  try {
    const supabase = await createClient();

    // Get the installation for this workspace
    const { data: installation, error } = await supabase
      .from("github_installations")
      .select("installation_id")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !installation) {
      console.error("No GitHub installation found for workspace:", workspaceId);
      return null;
    }

    // Get an installation access token
    const app = getGitHubApp();

    // Get installation-authenticated Octokit instance
    const octokit = await app.getInstallationOctokit(
      installation.installation_id,
    );

    // Create an installation access token
    const installationToken = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installation.installation_id,
      },
    );

    return createGitHubService(installationToken.data.token);
  } catch (error) {
    console.error("Error getting GitHub App service:", error);
    return null;
  }
}

export async function getInstallationOctokit(installationId: number) {
  const app = getGitHubApp();
  return await app.getInstallationOctokit(installationId);
}

// Fallback to user token if no installation exists
export async function getServerGitHubService(
  workspaceId?: string,
): Promise<GitHubService | null> {
  // If workspace ID is provided, try to use GitHub App first
  if (workspaceId) {
    const appService = await getGitHubAppService(workspaceId);
    if (appService) {
      return appService;
    }
  }

  // Fallback to user's OAuth token
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    console.error("No session found for GitHub service");
    return null;
  }

  const providerToken = session.provider_token;
  if (!providerToken) {
    console.error("No GitHub provider token found in session");
    return null;
  }

  return createGitHubService(providerToken);
}
