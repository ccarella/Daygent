import { isPullRequestEvent, PullRequestSyncData } from "../types";
import {
  getRepositoryByGithubId,
  getOrCreateUserByGithubId,
  linkPullRequestToIssues,
  parseIssueReferences,
} from "../db-utils";

export async function handlePullRequestEvent(payload: unknown): Promise<void> {
  if (!isPullRequestEvent(payload)) {
    console.error("[PR Handler] Invalid payload type");
    return;
  }

  const { action, pull_request, repository, sender } = payload;
  
  console.log(`[PR Handler] Processing ${action} for PR #${pull_request.number}`);

  try {
    // Get repository from database
    const repo = await getRepositoryByGithubId(repository.id);
    if (!repo) {
      console.warn(`[PR Handler] Repository not found: ${repository.full_name}`);
      return;
    }

    // We only care about certain actions
    if (!["opened", "edited", "closed", "reopened", "synchronize"].includes(action)) {
      console.log(`[PR Handler] Ignoring action: ${action}`);
      return;
    }

    // Parse issue references from PR body and title
    const linkedIssues = new Set<number>();
    
    if (pull_request.body) {
      parseIssueReferences(pull_request.body).forEach(num => linkedIssues.add(num));
    }
    if (pull_request.title) {
      parseIssueReferences(pull_request.title).forEach(num => linkedIssues.add(num));
    }

    // Determine PR status
    let prStatus: "open" | "merged" | "closed" = "open";
    if (pull_request.merged) {
      prStatus = "merged";
    } else if (pull_request.state === "closed") {
      prStatus = "closed";
    }

    // Prepare PR data
    const prData: PullRequestSyncData = {
      github_pr_number: pull_request.number,
      github_pr_id: pull_request.id,
      title: pull_request.title,
      status: prStatus,
      linked_issues: Array.from(linkedIssues),
      updated_at: pull_request.updated_at,
    };

    // Link PR to issues if any
    if (prData.linked_issues.length > 0) {
      await linkPullRequestToIssues(repo.id, prData);
      console.log(`[PR Handler] Linked PR #${pull_request.number} to issues: ${prData.linked_issues.join(", ")}`);
    }

    // Get or create sender user for activity logging
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email
    );

    if (!senderUser) {
      console.error("[PR Handler] Failed to get/create sender user");
      return;
    }

    // Log activity based on action
    let activityType: "pr_created" | "pr_merged" | "pr_closed";
    const metadata: Record<string, unknown> = {
      action,
      pr_number: pull_request.number,
      pr_title: pull_request.title,
      github_pr_id: pull_request.id,
      linked_issues: prData.linked_issues,
      base_branch: pull_request.base.ref,
      head_branch: pull_request.head.ref,
    };

    if (action === "opened") {
      activityType = "pr_created";
    } else if (pull_request.merged) {
      activityType = "pr_merged";
      metadata.merged_by = pull_request.merged_by?.login || "unknown";
      metadata.merge_commit_sha = pull_request.merge_commit_sha;
    } else if (action === "closed" && !pull_request.merged) {
      activityType = "pr_closed";
    } else {
      // For other actions, we'll use pr_created as a generic type
      activityType = "pr_created";
      metadata.update_type = action;
    }

    // Activity logging removed - no activities table

    console.log(`[PR Handler] Successfully processed ${action} for PR #${pull_request.number}`);
  } catch (error) {
    console.error("[PR Handler] Error processing PR event:", error);
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}

export async function handlePullRequestReviewEvent(payload: unknown): Promise<void> {
  // This is a simplified handler for PR reviews
  // In a production system, you might want to track reviews separately
  
  if (!payload || typeof payload !== "object" || !("action" in payload)) {
    console.error("[PR Review Handler] Invalid payload");
    return;
  }

  const { action } = payload as { action: string };
  console.log(`[PR Review Handler] Processing ${action} (not implemented yet)`);
  
  // TODO: Implement PR review handling if needed
  // This could include tracking review states, comments, approvals, etc.
}