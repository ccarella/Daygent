import { ApolloError } from '@apollo/client';
import { GitHubGraphQLError } from './types';

export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 1000; // 1 second

export class GitHubGraphQLClientError extends Error {
  constructor(
    message: string,
    public errors: GitHubGraphQLError[] = [],
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'GitHubGraphQLClientError';
  }
}

export function parseApolloError(error: ApolloError): GitHubGraphQLClientError {
  const graphqlErrors = error.graphQLErrors || [];
  const networkError = error.networkError;

  if (networkError && 'statusCode' in networkError) {
    const statusCode = (networkError as { statusCode?: number }).statusCode;
    
    if (statusCode === 401) {
      return new GitHubGraphQLClientError(
        'Authentication failed. Please check your GitHub token.',
        [],
        statusCode,
      );
    }
    
    if (statusCode === 403) {
      return new GitHubGraphQLClientError(
        'Forbidden. You may not have the required permissions.',
        [],
        statusCode,
      );
    }
    
    if (statusCode === 429) {
      return new GitHubGraphQLClientError(
        'Rate limit exceeded. Please try again later.',
        [],
        statusCode,
      );
    }
    
    if (statusCode && statusCode >= 500) {
      return new GitHubGraphQLClientError(
        networkError.message || 'Internal Server Error',
        [],
        statusCode,
      );
    }
  }

  const errors: GitHubGraphQLError[] = graphqlErrors.map((error) => ({
    message: error.message,
    type: error.extensions?.code as string | undefined,
    path: error.path,
    extensions: error.extensions,
  }));

  return new GitHubGraphQLClientError(
    error.message || 'An unknown error occurred',
    errors,
  );
}

export function shouldRetry(error: unknown, attempt: number): boolean {
  if (attempt >= MAX_RETRIES) return false;

  // Handle ApolloError directly
  if (error && typeof error === 'object' && 'networkError' in error) {
    const apolloError = error as ApolloError;
    const networkError = apolloError.networkError;
    
    if (networkError && 'statusCode' in networkError) {
      const statusCode = (networkError as { statusCode?: number }).statusCode;
      // Retry on rate limit or server errors
      return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
    }
  }

  if (error instanceof GitHubGraphQLClientError) {
    // Retry on rate limit or server errors
    return error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500);
  }

  // Retry on network errors
  if (error instanceof Error && error.message.includes('Network')) {
    return true;
  }

  return false;
}

export function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return INITIAL_RETRY_DELAY * Math.pow(2, attempt);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractRateLimitFromResponse(response: unknown): {
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: Date;
  };
} {
  const responseWithHeaders = response as { headers?: Map<string, string> };
  const headers = responseWithHeaders?.headers;
  if (!headers) return {};

  const limit = parseInt(headers.get('X-RateLimit-Limit') || '0', 10);
  const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0', 10);
  const reset = parseInt(headers.get('X-RateLimit-Reset') || '0', 10);

  if (limit && reset) {
    return {
      rateLimit: {
        limit,
        remaining,
        resetAt: new Date(reset * 1000),
      },
    };
  }

  return {};
}