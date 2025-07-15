import { IssueSyncData } from "@/app/api/webhooks/github/types";

// GitHub GraphQL Issue type (based on GET_ISSUES query)
export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: "OPEN" | "CLOSED";
  stateReason?: "COMPLETED" | "NOT_PLANNED" | "REOPENED" | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  author: {
    login: string;
    avatarUrl?: string;
    url?: string;
    name?: string | null;
  } | null;
  assignees: {
    totalCount: number;
    nodes: Array<{
      id: string;
      login: string;
      name?: string | null;
      avatarUrl?: string;
      url?: string;
    }>;
  };
  labels: {
    totalCount: number;
    nodes: Array<{
      id: string;
      name: string;
      color: string;
      description?: string | null;
    }>;
  };
  milestone?: {
    id: string;
    title: string;
    number: number;
    state: "OPEN" | "CLOSED";
    dueOn?: string | null;
  } | null;
  comments: {
    totalCount: number;
  };
}

/**
 * Maps GitHub issue state to internal status
 * @param state - GitHub issue state (OPEN or CLOSED)
 * @param stateReason - Optional reason for closure
 * @returns Internal status representation
 */
export function mapGitHubStateToStatus(
  state: "OPEN" | "CLOSED",
  stateReason?: "COMPLETED" | "NOT_PLANNED" | "REOPENED" | null,
): IssueSyncData["status"] {
  if (state === "CLOSED") {
    // Map based on state reason
    if (stateReason === "COMPLETED") {
      return "completed";
    } else if (stateReason === "NOT_PLANNED") {
      return "cancelled";
    }
    return "completed"; // Default closed to completed
  }

  // For open issues, default to "open"
  // Could be enhanced to check labels for "in progress" or "review"
  return "open";
}

/**
 * Extracts priority from GitHub issue labels
 * @param labels - GitHub issue labels
 * @returns Priority level or null if no priority label found
 */
export function extractPriorityFromLabels(
  labels: GitHubIssue["labels"],
): "urgent" | "high" | "medium" | "low" | null {
  const priorityLabels = {
    urgent: ["urgent", "critical", "p0", "priority: urgent"],
    high: ["high", "important", "p1", "priority: high"],
    medium: ["medium", "p2", "priority: medium"],
    low: ["low", "p3", "priority: low"],
  };

  for (const node of labels.nodes) {
    const labelName = node.name.toLowerCase();

    for (const [priority, patterns] of Object.entries(priorityLabels)) {
      if (patterns.some((pattern) => labelName.includes(pattern))) {
        return priority as "urgent" | "high" | "medium" | "low";
      }
    }
  }

  return null; // No priority found
}

/**
 * Transforms GitHub issue to internal sync data format
 * @param issue - GitHub issue from GraphQL API
 * @param assigneeUserId - Optional resolved user ID for assignee
 * @returns Issue data formatted for database sync
 */
export function mapGitHubIssueToSyncData(
  issue: GitHubIssue,
  assigneeUserId?: string | null,
): IssueSyncData {
  return {
    github_issue_number: issue.number,
    github_issue_id: parseInt(issue.id, 10), // GitHub GraphQL IDs are strings
    title: issue.title,
    original_description: issue.body,
    status: mapGitHubStateToStatus(issue.state, issue.stateReason),
    assigned_to: assigneeUserId || null,
    updated_at: issue.updatedAt,
    completed_at: issue.closedAt,
  };
}

/**
 * Formats issue body for GitHub, including AI enhancements if available
 * @param originalDescription - Original issue description
 * @param expandedDescription - AI-enhanced description
 * @param status - Current issue status
 * @param priority - Issue priority level
 * @returns Formatted issue body for GitHub
 */
export function formatIssueBodyForGitHub(
  originalDescription: string | null,
  expandedDescription: string | null,
  status: string,
  priority: string | null,
): string {
  let body = originalDescription || "";

  // Only add AI section if we have expanded description
  if (expandedDescription) {
    body += `

---
<!-- Daygent:Start -->
## 🤖 AI-Enhanced Description

${expandedDescription}

**Status**: ${status}${priority ? `\n**Priority**: ${priority}` : ""}
<!-- Daygent:End -->`;
  }

  return body;
}

/**
 * Extracts original description from GitHub body, removing AI enhancements
 * @param body - Full GitHub issue body
 * @returns Original description without AI-enhanced content
 */
export function extractOriginalDescription(body: string | null): string | null {
  if (!body) return null;

  // Remove the AI-enhanced section if present
  const daygentStartIndex = body.indexOf("<!-- Daygent:Start -->");
  if (daygentStartIndex !== -1) {
    // Also remove the separator line before the Daygent section
    let endIndex = daygentStartIndex;
    const beforeDaygent = body.substring(0, daygentStartIndex);
    if (beforeDaygent.endsWith("\n---\n")) {
      endIndex -= 5; // Remove "\n---\n"
    } else if (beforeDaygent.endsWith("---\n")) {
      endIndex -= 4; // Remove "---\n"
    }
    return body.substring(0, endIndex).trim();
  }

  return body;
}

/**
 * Parses pull request references from issue body or title
 * @param text - Text to search for PR references
 * @returns Array of PR numbers referenced in the text
 */
export function extractPullRequestReferences(
  title: string,
  body: string | null,
): number[] {
  const prNumbers: number[] = [];
  const prPattern = /#(\d+)/g;

  // Check title
  const titleMatches = title.matchAll(prPattern);
  for (const match of titleMatches) {
    prNumbers.push(parseInt(match[1], 10));
  }

  // Check body
  if (body) {
    const bodyMatches = body.matchAll(prPattern);
    for (const match of bodyMatches) {
      prNumbers.push(parseInt(match[1], 10));
    }
  }

  // Return unique PR numbers
  return [...new Set(prNumbers)];
}

/**
 * Generates a human-readable summary of sync results
 * @param issueCount - Total number of issues processed
 * @param created - Number of issues created
 * @param updated - Number of issues updated
 * @param errors - Number of errors encountered
 * @returns Summary string for activity logging
 */
export function generateSyncSummary(
  issueCount: number,
  created: number,
  updated: number,
  errors: number,
): string {
  const parts = [];

  if (created > 0) {
    parts.push(`${created} created`);
  }

  if (updated > 0) {
    parts.push(`${updated} updated`);
  }

  if (errors > 0) {
    parts.push(`${errors} errors`);
  }

  if (parts.length === 0) {
    return "No changes";
  }

  return `Synced ${issueCount} issues: ${parts.join(", ")}`;
}
