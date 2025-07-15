import { describe, it, expect } from "vitest";
import { ApolloError } from "@apollo/client";
import {
  GitHubGraphQLClientError,
  parseApolloError,
  shouldRetry,
  getRetryDelay,
  sleep,
  extractRateLimitFromResponse,
  MAX_RETRIES,
  INITIAL_RETRY_DELAY,
} from "../utils";

describe("GitHub GraphQL Utils", () => {
  describe("GitHubGraphQLClientError", () => {
    it("should create error with message and errors array", () => {
      const errors = [{ message: "Test error" }];
      const error = new GitHubGraphQLClientError("Test message", errors, 400);

      expect(error.message).toBe("Test message");
      expect(error.errors).toEqual(errors);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("GitHubGraphQLClientError");
    });
  });

  describe("parseApolloError", () => {
    it("should parse authentication error (401)", () => {
      const apolloError = new ApolloError({
        networkError: Object.assign(new Error("Unauthorized"), {
          statusCode: 401,
        }),
      });

      const error = parseApolloError(apolloError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain("Authentication failed");
    });

    it("should parse forbidden error (403)", () => {
      const apolloError = new ApolloError({
        networkError: Object.assign(new Error("Forbidden"), {
          statusCode: 403,
        }),
      });

      const error = parseApolloError(apolloError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Forbidden");
    });

    it("should parse rate limit error (429)", () => {
      const apolloError = new ApolloError({
        networkError: Object.assign(new Error("Too Many Requests"), {
          statusCode: 429,
        }),
      });

      const error = parseApolloError(apolloError);
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain("Rate limit exceeded");
    });

    it("should parse GraphQL errors", () => {
      const graphQLErrors = [
        {
          message: "Field not found",
          path: ["repository", "issues"],
          extensions: { code: "FIELD_NOT_FOUND" },
        },
      ];

      const apolloError = new ApolloError({
        graphQLErrors: graphQLErrors,
      });

      const error = parseApolloError(apolloError);
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0].message).toBe("Field not found");
      expect(error.errors[0].type).toBe("FIELD_NOT_FOUND");
      expect(error.errors[0].path).toEqual(["repository", "issues"]);
    });

    it("should handle error without message", () => {
      const apolloError = new ApolloError({});
      const error = parseApolloError(apolloError);
      expect(error.message).toBe("An unknown error occurred");
    });
  });

  describe("shouldRetry", () => {
    it("should not retry after max attempts", () => {
      const error = new GitHubGraphQLClientError("Error", [], 500);
      expect(shouldRetry(error, MAX_RETRIES)).toBe(false);
    });

    it("should retry on rate limit error", () => {
      const error = new GitHubGraphQLClientError("Error", [], 429);
      expect(shouldRetry(error, 0)).toBe(true);
    });

    it("should retry on server errors", () => {
      const error = new GitHubGraphQLClientError("Error", [], 500);
      expect(shouldRetry(error, 0)).toBe(true);

      const error502 = new GitHubGraphQLClientError("Error", [], 502);
      expect(shouldRetry(error502, 0)).toBe(true);
    });

    it("should not retry on client errors", () => {
      const error = new GitHubGraphQLClientError("Error", [], 400);
      expect(shouldRetry(error, 0)).toBe(false);
    });

    it("should retry on network errors", () => {
      const error = new Error("Network request failed");
      expect(shouldRetry(error, 0)).toBe(true);
    });

    it("should not retry on non-network errors", () => {
      const error = new Error("Some other error");
      expect(shouldRetry(error, 0)).toBe(false);
    });
  });

  describe("getRetryDelay", () => {
    it("should calculate exponential backoff", () => {
      expect(getRetryDelay(0)).toBe(INITIAL_RETRY_DELAY);
      expect(getRetryDelay(1)).toBe(INITIAL_RETRY_DELAY * 2);
      expect(getRetryDelay(2)).toBe(INITIAL_RETRY_DELAY * 4);
      expect(getRetryDelay(3)).toBe(INITIAL_RETRY_DELAY * 8);
    });
  });

  describe("sleep", () => {
    it("should delay for specified milliseconds", async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small variance
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe("extractRateLimitFromResponse", () => {
    it("should extract rate limit from headers", () => {
      const headers = new Map([
        ["X-RateLimit-Limit", "5000"],
        ["X-RateLimit-Remaining", "4999"],
        ["X-RateLimit-Reset", "1234567890"],
      ]);

      const response = { headers };
      const result = extractRateLimitFromResponse(response);

      expect(result.rateLimit).toBeDefined();
      expect(result.rateLimit?.limit).toBe(5000);
      expect(result.rateLimit?.remaining).toBe(4999);
      expect(result.rateLimit?.resetAt).toEqual(new Date(1234567890 * 1000));
    });

    it("should return empty object when headers missing", () => {
      const response = {};
      const result = extractRateLimitFromResponse(response);
      expect(result).toEqual({});
    });

    it("should return empty object when rate limit headers missing", () => {
      const headers = new Map([["Content-Type", "application/json"]]);
      const response = { headers };
      const result = extractRateLimitFromResponse(response);
      expect(result).toEqual({});
    });
  });
});
