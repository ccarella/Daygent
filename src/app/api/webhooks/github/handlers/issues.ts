import { isIssuesEvent } from "../types";
import {
  getRepositoryByGithubId,
} from "../db-utils";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function handleIssueEvent(payload: unknown): Promise<void> {
  if (!isIssuesEvent(payload)) {
    console.error("[Issue Handler] Invalid payload type");
    return;
  }

  const { action, issue, repository } = payload;
  
  console.log(`[Issue Handler] Processing ${action} for issue #${issue.number}`);

  try {
    // Get repository from database
    const repo = await getRepositoryByGithubId(repository.id);
    if (!repo) {
      console.warn(`[Issue Handler] Repository not found: ${repository.full_name}`);
      return;
    }

    const supabase = await createServiceRoleClient();

    // Handle different actions
    switch (action) {
      case "opened":
      case "edited":
      case "reopened":
      case "closed":
        // Upsert issue
        const { error } = await supabase
          .from("issues")
          .upsert({
            repository_id: repo.id,
            workspace_id: repo.workspace_id,
            github_issue_number: issue.number,
            github_issue_id: issue.id,
            github_node_id: issue.node_id,
            title: issue.title,
            body: issue.body || "",
            state: issue.state,
            author_github_login: issue.user?.login,
            assignee_github_login: issue.assignee?.login,
            labels: issue.labels?.map((label: { name: string; color: string; description?: string | null }) => ({
              name: label.name,
              color: label.color,
              description: label.description || undefined,
            })) || [],
            github_created_at: issue.created_at,
            github_updated_at: issue.updated_at,
            github_closed_at: issue.closed_at,
          });

        if (error) {
          console.error("[Issue Handler] Failed to upsert issue:", error);
          return;
        }
        break;

      case "assigned":
      case "unassigned":
        // Update assignee
        const { error: assignError } = await supabase
          .from("issues")
          .update({
            assignee_github_login: issue.assignee?.login,
            github_updated_at: issue.updated_at,
          })
          .eq("repository_id", repo.id)
          .eq("github_issue_number", issue.number);

        if (assignError) {
          console.error("[Issue Handler] Failed to update assignee:", assignError);
          return;
        }
        break;

      case "labeled":
      case "unlabeled":
        // Update labels
        const { error: labelError } = await supabase
          .from("issues")
          .update({
            labels: issue.labels?.map((label: { name: string; color: string; description?: string | null }) => ({
              name: label.name,
              color: label.color,
              description: label.description || undefined,
            })) || [],
            github_updated_at: issue.updated_at,
          })
          .eq("repository_id", repo.id)
          .eq("github_issue_number", issue.number);

        if (labelError) {
          console.error("[Issue Handler] Failed to update labels:", labelError);
          return;
        }
        break;
    }

    console.log(`[Issue Handler] Successfully processed ${action} for issue #${issue.number}`);
  } catch (error) {
    console.error("[Issue Handler] Error processing issue event:", error);
    // Don't throw - we want webhook to return 200 OK to GitHub
  }
}