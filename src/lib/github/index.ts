export * from "./client";
export * from "./types";
export * from "./utils";

// Export all queries
export * from "./queries/repository";
export * from "./queries/issues";
export * from "./queries/pullRequests";

// Export all mutations
export * from "./mutations/createIssue";
export * from "./mutations/updateIssue";

// Re-export commonly used types from Apollo
export type { ApolloError } from "@apollo/client";

// Export GraphQL enum types that will be generated
export enum IssueState {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

export enum PullRequestState {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  MERGED = "MERGED",
}

export enum SearchType {
  ISSUE = "ISSUE",
  REPOSITORY = "REPOSITORY",
  USER = "USER",
  DISCUSSION = "DISCUSSION",
}

export enum IssueOrderField {
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
  COMMENTS = "COMMENTS",
}

export enum OrderDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export enum RepositoryOrderField {
  CREATED_AT = "CREATED_AT",
  UPDATED_AT = "UPDATED_AT",
  PUSHED_AT = "PUSHED_AT",
  NAME = "NAME",
  STARGAZERS = "STARGAZERS",
}
