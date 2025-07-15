import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GitHubGraphQLClient, createGitHubGraphQLClient } from "@/lib/github";
import type { Session } from "@supabase/supabase-js";

interface UseGitHubGraphQLReturn {
  client: GitHubGraphQLClient | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to use GitHub GraphQL client in React components.
 * Automatically handles authentication using Supabase session.
 *
 * @example
 * ```tsx
 * const { client, isLoading, error } = useGitHubGraphQL();
 *
 * const fetchRepositories = async () => {
 *   if (!client) return;
 *   const data = await client.query(LIST_USER_REPOSITORIES, { first: 10 });
 *   // Use data...
 * };
 * ```
 */
export function useGitHubGraphQL(): UseGitHubGraphQLReturn {
  const [client, setClient] = useState<GitHubGraphQLClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const initializeClient = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = supabaseRef.current;
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      if (!session) {
        setClient(null);
        return;
      }

      const providerToken = session.provider_token;

      if (!providerToken) {
        throw new Error("No GitHub provider token found in session");
      }

      // Create client with dynamic token getter to handle token refresh
      const graphqlClient = createGitHubGraphQLClient(() => {
        // Note: This is synchronous as required by the client
        // The token is updated when auth state changes
        return providerToken;
      });

      setClient(graphqlClient);
    } catch (err) {
      console.error("Failed to initialize GitHub GraphQL client:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeClient();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabaseRef.current.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!session?.provider_token) {
          setClient(null);
        } else {
          initializeClient();
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeClient]);

  return {
    client,
    isLoading,
    error,
    refetch: initializeClient,
  };
}
