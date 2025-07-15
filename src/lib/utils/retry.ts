/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<
  Omit<RetryOptions, "retryCondition" | "onRetry">
> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn The function to retry
 * @param options Retry configuration
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (options.retryCondition && !options.retryCondition(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay,
      );

      // Notify about retry
      if (options.onRetry) {
        options.onRetry(attempt, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if an error is a GitHub API rate limit error
 */
export function isGitHubRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes("rate limit") ||
      error.message.includes("429") ||
      error.message.includes("secondary rate limit")
    );
  }
  return false;
}

/**
 * Check if an error is a transient network error
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("econnrefused") ||
      isGitHubRateLimitError(error)
    );
  }
  return false;
}
