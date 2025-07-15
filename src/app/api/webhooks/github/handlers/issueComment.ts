import { isIssueCommentEvent, CommentSyncData } from "../types";
import {
  getRepositoryByGithubId,
  getOrCreateUserByGithubId,
  syncIssueComment,
} from "../db-utils";

export async function handleIssueCommentEvent(payload: unknown): Promise<void> {
  if (!isIssueCommentEvent(payload)) {
    console.error("[Issue Comment Handler] Invalid payload type");
    return;
  }

  const { action, issue, comment, repository, sender } = payload;

  console.log(
    `[Issue Comment Handler] Processing ${action} for comment on issue #${issue.number}`,
  );

  try {
    // Get repository from database
    const repo = await getRepositoryByGithubId(repository.id);
    if (!repo) {
      console.warn(
        `[Issue Comment Handler] Repository not found: ${repository.full_name}`,
      );
      return;
    }

    // We only care about created, edited, and deleted actions
    if (!["created", "edited", "deleted"].includes(action)) {
      console.log(`[Issue Comment Handler] Ignoring action: ${action}`);
      return;
    }

    // For deleted comments, we'll mark them with a special prefix
    const commentContent =
      action === "deleted" ? `[Comment deleted]` : comment.body;

    // Prepare comment data
    const commentData: CommentSyncData = {
      github_comment_id: comment.id,
      content: commentContent,
      user_github_id: comment.user.id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };

    // Sync comment to database
    const syncedComment = await syncIssueComment(
      repo.id,
      issue.number,
      commentData,
    );

    if (!syncedComment) {
      console.error("[Issue Comment Handler] Failed to sync comment");
      return;
    }

    // Get or create sender user for activity logging
    const senderUser = await getOrCreateUserByGithubId(
      sender.id,
      sender.login,
      sender.email,
    );

    if (!senderUser) {
      console.error("[Issue Comment Handler] Failed to get/create sender user");
      return;
    }

    // Activity logging removed - no activities table

    console.log(
      `[Issue Comment Handler] Successfully processed ${action} for comment ${comment.id}`,
    );
  } catch (error) {
    console.error(
      "[Issue Comment Handler] Error processing comment event:",
      error,
    );
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}
