import { isIssuesEvent, IssueSyncData } from "../types";
import {
  getRepositoryByGithubId,
  getOrCreateUserByGithubId,
  syncIssue,
  logActivity,
} from "../db-utils";

export async function handleIssueEvent(payload: unknown): Promise<void> {
  if (!isIssuesEvent(payload)) {
    console.error("[Issue Handler] Invalid payload type");
    return;
  }

  const { action, issue, repository, sender } = payload;
  
  console.log(`[Issue Handler] Processing ${action} for issue #${issue.number}`);

  try {
    // Get repository from database
    const repo = await getRepositoryByGithubId(repository.id);
    if (!repo) {
      console.warn(`[Issue Handler] Repository not found: ${repository.full_name}`);
      return;
    }

    // Map GitHub issue state to our status
    let status: IssueSyncData["status"] = "open";
    let completedAt: string | null = null;

    switch (issue.state) {
      case "closed":
        status = "completed";
        completedAt = issue.closed_at || new Date().toISOString();
        break;
      case "open":
        if (issue.assignee) {
          status = "in_progress";
        }
        break;
    }

    // Get or create assignee user if assigned
    let assignedToUserId: string | null = null;
    if (issue.assignee) {
      const assignee = await getOrCreateUserByGithubId(
        issue.assignee.id,
        issue.assignee.login,
        issue.assignee.email
      );
      assignedToUserId = assignee?.id || null;
    }

    // Prepare issue data for sync
    const issueData: IssueSyncData = {
      github_issue_number: issue.number,
      github_issue_id: issue.id,
      title: issue.title,
      original_description: issue.body || null,
      status,
      assigned_to: assignedToUserId,
      updated_at: issue.updated_at,
      completed_at: completedAt,
    };

    // Sync issue to database
    const syncedIssue = await syncIssue(repo.id, issueData);
    if (!syncedIssue) {
      console.error("[Issue Handler] Failed to sync issue");
      return;
    }

    // Get or create sender user for activity logging
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email
    );

    if (!senderUser) {
      console.error("[Issue Handler] Failed to get/create sender user");
      return;
    }

    // Log activity based on action
    let activityType: "issue_created" | "issue_updated" | "issue_completed" | "issue_assigned";
    const metadata: Record<string, unknown> = {
      action,
      issue_number: issue.number,
      issue_title: issue.title,
      github_issue_id: issue.id,
    };

    switch (action) {
      case "opened":
        activityType = "issue_created";
        break;
      case "closed":
        activityType = "issue_completed";
        break;
      case "assigned":
      case "unassigned":
        activityType = "issue_assigned";
        metadata.assignee = issue.assignee?.login || null;
        break;
      default:
        activityType = "issue_updated";
    }

    await logActivity(
      activityType,
      metadata,
      senderUser.id,
      repo.organization_id,
      repo.id,
      syncedIssue.project_id,
      syncedIssue.id
    );

    console.log(`[Issue Handler] Successfully processed ${action} for issue #${issue.number}`);
  } catch (error) {
    console.error("[Issue Handler] Error processing issue event:", error);
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}