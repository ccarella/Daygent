import { createClient } from "@/lib/supabase/server";
import { createGitHubService } from "./github.service";
import type { GitHubService } from "./github.service";

export async function getServerGitHubService(): Promise<GitHubService | null> {
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
