import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IssueItem } from "../IssueItem";
import type { Issue as WorkspaceIssue, Repository } from "@/types/workspace";

type Issue = WorkspaceIssue & {
  repository: { id: string; name: string; full_name: string } | null;
};

const mockIssue: Issue = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  repository_id: "repo-1",
  workspace_id: "workspace-1",
  github_issue_number: 42,
  github_issue_id: 12345,
  github_node_id: "I_kwDOBmJvEc5QdMYp",
  title: "Fix authentication bug",
  body: "Users can't log in",
  state: "open" as const,
  author_github_login: "johnsmith",
  assignee_github_login: "janedoe",
  labels: [
    { name: "bug", color: "#d73a4a" },
    { name: "urgent", color: "#e99695" }
  ],
  github_created_at: new Date(Date.now() - 86400000).toISOString(),
  github_updated_at: new Date(Date.now() - 3600000).toISOString(),
  github_closed_at: null,
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date(Date.now() - 3600000).toISOString(),
  repository: {
    id: "repo-1",
    name: "daygent",
    full_name: "org/daygent",
    workspace_id: "workspace-1",
    github_id: 123456,
    owner: "org",
    private: false,
    default_branch: "main",
    installation_id: null,
    last_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as Repository & { id: string; name: string; full_name: string },
};

describe("IssueItem", () => {
  it("should render issue title and number", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
  });

  it("should render state indicator", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("should render repository name", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("daygent")).toBeInTheDocument();
  });



  it("should show relative time for updates", () => {
    render(<IssueItem issue={mockIssue} />);

    // The exact text depends on the time, but should contain "ago"
    expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
  });

  it("should link to issue detail page", () => {
    render(<IssueItem issue={mockIssue} />);

    const link = screen.getByRole("link", { name: /#42.*Fix authentication bug/ });
    expect(link).toHaveAttribute("href", `/issues/${mockIssue.id}`);
  });

  it("should handle missing repository gracefully", () => {
    const issueWithoutRepository = {
      ...mockIssue,
      repository: null as any,
    };

    render(<IssueItem issue={issueWithoutRepository} />);

    // Should still render without errors
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
    expect(screen.queryByText("daygent")).not.toBeInTheDocument();
  });

  it("should use issue ID when no GitHub issue number", () => {
    const issueWithoutGitHub = {
      ...mockIssue,
      github_issue_number: 0,
    };

    render(<IssueItem issue={issueWithoutGitHub} />);

    expect(screen.getByText("#123e4567")).toBeInTheDocument();
  });
});