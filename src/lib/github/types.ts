export interface AuthConfig {
  type: "user" | "installation" | "app";
  token: string;
}

export interface GitHubGraphQLError {
  message: string;
  type?: string;
  path?: readonly (string | number)[];
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
}

export interface RateLimitInfo {
  limit: number;
  cost: number;
  remaining: number;
  resetAt: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}
