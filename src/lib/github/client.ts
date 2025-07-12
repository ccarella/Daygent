import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  NormalizedCacheObject,
  DocumentNode,
  ApolloError,
  OperationVariables,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { AuthConfig } from './types';
import { parseApolloError, shouldRetry, getRetryDelay, sleep } from './utils';

const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql';

const httpLink = createHttpLink({
  uri: GITHUB_GRAPHQL_API,
});

const createAuthLink = (getAuth: () => AuthConfig | null) => {
  return setContext((_, { headers }) => {
    const auth = getAuth();
    if (!auth) {
      console.warn('No authentication token available for GitHub GraphQL request');
      return { headers };
    }

    return {
      headers: {
        ...headers,
        authorization: `Bearer ${auth.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
  });
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);
  }
});

const retryLink = new RetryLink({
  delay: {
    initial: 1000,
    max: 10000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      return shouldRetry(error, 0);
    },
  },
});

export interface GitHubGraphQLClientOptions {
  getAuth: () => AuthConfig | null;
  onRateLimit?: (remaining: number, resetAt: Date) => void;
}

export class GitHubGraphQLClient {
  private client: ApolloClient<NormalizedCacheObject>;
  private getAuth: () => AuthConfig | null;
  private onRateLimit?: (remaining: number, resetAt: Date) => void;

  constructor(options: GitHubGraphQLClientOptions) {
    this.getAuth = options.getAuth;
    this.onRateLimit = options.onRateLimit;

    const authLink = createAuthLink(this.getAuth);

    const link = ApolloLink.from([
      errorLink,
      retryLink,
      authLink,
      httpLink,
    ]);

    this.client = new ApolloClient({
      link,
      cache: new InMemoryCache({
        typePolicies: {
          Repository: {
            keyFields: ['id'],
          },
          Issue: {
            keyFields: ['id'],
          },
          PullRequest: {
            keyFields: ['id'],
          },
          User: {
            keyFields: ['id'],
          },
          Query: {
            fields: {
              repository: {
                merge(existing, incoming) {
                  return incoming;
                },
              },
            },
          },
        },
      }),
      defaultOptions: {
        query: {
          fetchPolicy: 'cache-first',
          errorPolicy: 'all',
        },
        watchQuery: {
          fetchPolicy: 'cache-and-network',
          errorPolicy: 'all',
        },
      },
    });
  }

  async query<TData, TVariables extends OperationVariables = OperationVariables>(
    query: DocumentNode,
    variables?: TVariables,
    options: {
      fetchPolicy?: 'cache-first' | 'network-only' | 'cache-and-network';
      retry?: boolean;
    } = {},
  ): Promise<TData> {
    const { fetchPolicy = 'cache-first', retry = true } = options;
    let attempt = 0;

    while (true) {
      try {
        const result = await this.client.query<TData, TVariables>({
          query,
          variables,
          fetchPolicy,
        });

        // Check rate limit headers from response context
        const context = result.data && (result as unknown as { context?: { response?: { headers?: Map<string, string> } } }).context;
        if (context?.response?.headers) {
          const headers = context.response.headers;
          const remaining = parseInt(
            headers.get('X-RateLimit-Remaining') || '0',
            10,
          );
          const reset = parseInt(
            headers.get('X-RateLimit-Reset') || '0',
            10,
          );

          if (remaining < 100 && reset && this.onRateLimit) {
            this.onRateLimit(remaining, new Date(reset * 1000));
          }
        }

        return result.data;
      } catch (error: unknown) {
        if (!retry || !shouldRetry(error, attempt)) {
          throw parseApolloError(error as ApolloError);
        }

        attempt++;
        const delay = getRetryDelay(attempt);
        console.log(`Retrying after ${delay}ms (attempt ${attempt}/${3})`);
        await sleep(delay);
      }
    }
  }

  async mutate<TData, TVariables extends OperationVariables = OperationVariables>(
    mutation: DocumentNode,
    variables?: TVariables,
  ): Promise<TData> {
    try {
      const result = await this.client.mutate<TData, TVariables>({
        mutation,
        variables,
      });

      if (!result.data) {
        throw new Error('Mutation returned no data');
      }

      return result.data;
    } catch (error: unknown) {
      throw parseApolloError(error as ApolloError);
    }
  }

  clearCache(): void {
    this.client.clearStore();
  }

  resetCache(): void {
    this.client.resetStore();
  }
}

// Factory function to create client with Supabase session token
export function createGitHubGraphQLClient(
  getProviderToken: () => string | null,
): GitHubGraphQLClient {
  return new GitHubGraphQLClient({
    getAuth: () => {
      const token = getProviderToken();
      if (!token) return null;
      return { type: 'user', token };
    },
    onRateLimit: (remaining, resetAt) => {
      console.warn(
        `GitHub API rate limit warning: ${remaining} requests remaining, resets at ${resetAt}`,
      );
    },
  });
}