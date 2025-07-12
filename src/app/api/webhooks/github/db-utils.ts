import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ActivityType,
  IssueSyncData,
  PullRequestSyncData,
  CommentSyncData,
} from "./types";

// Helper to get repository by GitHub ID
export async function getRepositoryByGithubId(githubRepoId: number) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("github_id", githubRepoId)
    .single();

  if (error) {
    console.error("[Webhook DB] Error fetching repository:", error);
    return null;
  }

  return data;
}

// Helper to get or create user by GitHub ID
export async function getOrCreateUserByGithubId(
  githubUserId: number,
  githubUsername: string,
  email?: string | null
) {
  const supabase = await createServiceRoleClient();
  
  // First try to find existing user
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("github_id", githubUserId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new user if not found
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      github_id: githubUserId,
      github_username: githubUsername,
      email: email || `${githubUsername}@github.local`,
      name: githubUsername,
    })
    .select()
    .single();

  if (error) {
    console.error("[Webhook DB] Error creating user:", error);
    return null;
  }

  return newUser;
}

// Helper to find project by repository
export async function getProjectByRepositoryId(repositoryId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("repository_id", repositoryId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { // Not found is ok
    console.error("[Webhook DB] Error fetching project:", error);
  }

  return data;
}

// Helper to sync issue data
export async function syncIssue(
  repositoryId: string,
  issueData: IssueSyncData
) {
  const supabase = await createServiceRoleClient();

  // Find project for this repository
  const project = await getProjectByRepositoryId(repositoryId);
  if (!project) {
    console.warn("[Webhook DB] No active project found for repository:", repositoryId);
    return null;
  }

  // Check if issue already exists
  const { data: existingIssue } = await supabase
    .from("issues")
    .select("*")
    .eq("repository_id", repositoryId)
    .eq("github_issue_number", issueData.github_issue_number)
    .single();

  if (existingIssue) {
    // Update existing issue
    const { data, error } = await supabase
      .from("issues")
      .update({
        title: issueData.title,
        original_description: issueData.original_description,
        status: issueData.status,
        assigned_to: issueData.assigned_to,
        updated_at: issueData.updated_at,
        completed_at: issueData.completed_at,
      })
      .eq("id", existingIssue.id)
      .select()
      .single();

    if (error) {
      console.error("[Webhook DB] Error updating issue:", error);
      return null;
    }

    return data;
  } else {
    // Create new issue
    const { data, error } = await supabase
      .from("issues")
      .insert({
        project_id: project.id,
        repository_id: repositoryId,
        github_issue_number: issueData.github_issue_number,
        github_issue_id: issueData.github_issue_id,
        title: issueData.title,
        original_description: issueData.original_description,
        status: issueData.status,
        assigned_to: issueData.assigned_to,
        created_by: project.created_by, // Use project creator as default
        updated_at: issueData.updated_at,
        completed_at: issueData.completed_at,
      })
      .select()
      .single();

    if (error) {
      console.error("[Webhook DB] Error creating issue:", error);
      return null;
    }

    return data;
  }
}

// Helper to sync issue comment
export async function syncIssueComment(
  repositoryId: string,
  issueNumber: number,
  commentData: CommentSyncData
) {
  const supabase = await createServiceRoleClient();

  // Find the issue
  const { data: issue } = await supabase
    .from("issues")
    .select("*")
    .eq("repository_id", repositoryId)
    .eq("github_issue_number", issueNumber)
    .single();

  if (!issue) {
    console.error("[Webhook DB] Issue not found for comment sync");
    return null;
  }

  // Get or create user
  const user = await getOrCreateUserByGithubId(
    commentData.user_github_id,
    `github_user_${commentData.user_github_id}`
  );

  if (!user) {
    console.error("[Webhook DB] Could not get/create user for comment");
    return null;
  }

  // Check if comment already exists
  const { data: existingComment } = await supabase
    .from("issue_comments")
    .select("*")
    .eq("github_comment_id", commentData.github_comment_id)
    .single();

  if (existingComment) {
    // Update existing comment
    const { data, error } = await supabase
      .from("issue_comments")
      .update({
        content: commentData.content,
        updated_at: commentData.updated_at,
      })
      .eq("id", existingComment.id)
      .select()
      .single();

    if (error) {
      console.error("[Webhook DB] Error updating comment:", error);
      return null;
    }

    return data;
  } else {
    // Create new comment
    const { data, error } = await supabase
      .from("issue_comments")
      .insert({
        issue_id: issue.id,
        user_id: user.id,
        content: commentData.content,
        github_comment_id: commentData.github_comment_id,
        created_at: commentData.created_at,
        updated_at: commentData.updated_at,
      })
      .select()
      .single();

    if (error) {
      console.error("[Webhook DB] Error creating comment:", error);
      return null;
    }

    return data;
  }
}

// Helper to link PR to issues
export async function linkPullRequestToIssues(
  repositoryId: string,
  prData: PullRequestSyncData
) {
  const supabase = await createServiceRoleClient();

  // For each linked issue, update it with PR information
  for (const issueNumber of prData.linked_issues) {
    const { error } = await supabase
      .from("issues")
      .update({
        github_pr_number: prData.github_pr_number,
        github_pr_id: prData.github_pr_id,
        status: prData.status === "merged" ? "completed" : "review",
        completed_at: prData.status === "merged" ? prData.updated_at : null,
      })
      .eq("repository_id", repositoryId)
      .eq("github_issue_number", issueNumber);

    if (error) {
      console.error(`[Webhook DB] Error linking PR to issue #${issueNumber}:`, error);
    }
  }
}

// Helper to update repository installation
export async function updateRepositoryInstallation(
  fullName: string,
  installationId: number | null
) {
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("repositories")
    .update({
      installation_id: installationId,
      updated_at: new Date().toISOString(),
    })
    .eq("full_name", fullName);

  if (error) {
    console.error("[Webhook DB] Error updating repository installation:", error);
  }
}

// Helper to log activity
export async function logActivity(
  type: ActivityType,
  metadata: Record<string, unknown>,
  userId?: string,
  organizationId?: string,
  repositoryId?: string,
  projectId?: string,
  issueId?: string
) {
  const supabase = await createServiceRoleClient();

  // If we don't have organizationId but have repositoryId, fetch it
  if (!organizationId && repositoryId) {
    const { data: repo } = await supabase
      .from("repositories")
      .select("organization_id")
      .eq("id", repositoryId)
      .single();
    
    if (repo) {
      organizationId = repo.organization_id;
    }
  }

  // If we still don't have required fields, log and return
  if (!organizationId || !userId) {
    console.warn("[Webhook DB] Missing required fields for activity log:", {
      organizationId,
      userId,
      type,
    });
    return;
  }

  const { error } = await supabase.from("activities").insert({
    organization_id: organizationId,
    repository_id: repositoryId,
    project_id: projectId,
    issue_id: issueId,
    user_id: userId,
    type,
    metadata,
  });

  if (error) {
    console.error("[Webhook DB] Error logging activity:", error);
  }
}

// Helper to parse issue references from text (e.g., "Fixes #123")
export function parseIssueReferences(text: string): number[] {
  const issuePattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*#(\d+)/gi;
  const matches = text.matchAll(issuePattern);
  const issueNumbers = new Set<number>();

  for (const match of matches) {
    issueNumbers.add(parseInt(match[1], 10));
  }

  return Array.from(issueNumbers);
}