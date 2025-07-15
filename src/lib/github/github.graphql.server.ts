import { createClient } from "@/lib/supabase/server";
import { createGitHubGraphQLClient, GitHubGraphQLClient } from "./client";
import { AuthConfig } from "./types";

/**
 * Creates a GitHub GraphQL client using the current user's session token.
 * This should only be used in server components or API routes.
 *
 * @returns GitHubGraphQLClient instance or null if no session
 */
export async function getServerGitHubGraphQLClient(): Promise<GitHubGraphQLClient | null> {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    console.error("Failed to get session:", error);
    return null;
  }

  const providerToken = session.provider_token;

  if (!providerToken) {
    console.error("No GitHub provider token found in session");
    return null;
  }

  return createGitHubGraphQLClient(() => providerToken);
}

/**
 * Creates a GitHub GraphQL client with a specific authentication configuration.
 * Useful for GitHub App installations or custom authentication scenarios.
 *
 * @param authConfig Authentication configuration
 * @returns GitHubGraphQLClient instance
 */
export function createServerGitHubGraphQLClient(
  authConfig: AuthConfig,
): GitHubGraphQLClient {
  return new GitHubGraphQLClient({
    getAuth: () => authConfig,
  });
}
