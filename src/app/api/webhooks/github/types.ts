import {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  InstallationEvent,
  InstallationRepositoriesEvent,
} from "@octokit/webhooks-types";

// Re-export the webhook event types
export type {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  InstallationEvent,
  InstallationRepositoriesEvent,
};

// Common webhook headers interface
export interface WebhookHeaders {
  "x-github-event": string;
  "x-github-delivery": string;
  "x-hub-signature-256": string;
  "content-type": string;
}

// Activity type enum matching database schema
export type ActivityType =
  | "issue_created"
  | "issue_updated"
  | "issue_completed"
  | "issue_assigned"
  | "issue_commented"
  | "pr_created"
  | "pr_merged"
  | "pr_closed"
  | "repository_added"
  | "repository_removed"
  | "webhook_received";

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  message?: string;
  error?: string;
  processedAt: string;
}

// Issue sync data structure
export interface IssueSyncData {
  github_issue_number: number;
  github_issue_id: number;
  title: string;
  original_description: string | null;
  status: "open" | "in_progress" | "review" | "completed" | "cancelled";
  assigned_to?: string | null;
  updated_at: string;
  completed_at?: string | null;
}

// PR sync data structure
export interface PullRequestSyncData {
  github_pr_number: number;
  github_pr_id: number;
  title: string;
  status: "open" | "merged" | "closed";
  linked_issues: number[];
  updated_at: string;
}

// Comment sync data structure
export interface CommentSyncData {
  github_comment_id: number;
  content: string;
  user_github_id: number;
  created_at: string;
  updated_at: string;
}

// Installation sync data structure
export interface InstallationSyncData {
  installation_id: number;
  account_login: string;
  account_type: "User" | "Organization";
  repositories?: string[];
}

// Type guards for webhook events
export function isIssuesEvent(event: unknown): event is IssuesEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "issue" in event &&
    "action" in event
  );
}

export function isIssueCommentEvent(event: unknown): event is IssueCommentEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "issue" in event &&
    "comment" in event &&
    "action" in event
  );
}

export function isPullRequestEvent(event: unknown): event is PullRequestEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "pull_request" in event &&
    "action" in event
  );
}

export function isInstallationEvent(event: unknown): event is InstallationEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "installation" in event &&
    "action" in event
  );
}

export function isInstallationRepositoriesEvent(
  event: unknown
): event is InstallationRepositoriesEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "installation" in event &&
    "action" in event &&
    ("repositories_added" in event || "repositories_removed" in event)
  );
}