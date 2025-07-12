import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IssueItem } from "../IssueItem";
import type { Database } from "@/lib/database.types";

type Issue = Database["public"]["Tables"]["issues"]["Row"] & {
  project: { id: string; name: string } | null;
  repository: { id: string; name: string; full_name: string } | null;
  assigned_user: { id: string; name: string; avatar_url: string | null } | null;
  created_user: { id: string; name: string; avatar_url: string | null } | null;
};

const mockIssue: Issue = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  project_id: "proj-1",
  repository_id: "repo-1",
  github_issue_number: 42,
  github_issue_id: 12345,
  title: "Fix authentication bug",
  original_description: "Users can't log in",
  expanded_description: "AI enhanced description",
  status: "in_progress",
  priority: "high",
  created_by: "user-1",
  assigned_to: "user-2",
  github_pr_number: 123,
  github_pr_id: 54321,
  created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  completed_at: null,
  project: { id: "proj-1", name: "Auth Module" },
  repository: { id: "repo-1", name: "daygent", full_name: "org/daygent" },
  assigned_user: {
    id: "user-2",
    name: "Jane Doe",
    avatar_url: "https://example.com/avatar.jpg",
  },
  created_user: { id: "user-1", name: "John Smith", avatar_url: null },
};

describe("IssueItem", () => {
  it("should render issue title and number", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
  });

  it("should render status and priority indicators", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByTitle("High")).toBeInTheDocument();
  });

  it("should render project and repository names", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("Auth Module")).toBeInTheDocument();
    expect(screen.getByText("daygent")).toBeInTheDocument();
  });

  it("should render assignee avatar", () => {
    render(<IssueItem issue={mockIssue} />);

    // Check for avatar container
    const avatarContainer = screen.getByTestId("avatar-Jane Doe");
    expect(avatarContainer).toBeInTheDocument();
    
    // The avatar should show the fallback with initials when image is loading
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should render assignee initials when no avatar", () => {
    const issueWithoutAvatar = {
      ...mockIssue,
      assigned_user: { ...mockIssue.assigned_user!, avatar_url: null },
    };

    render(<IssueItem issue={issueWithoutAvatar} />);

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should show AI enhancement indicator", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByTitle("AI Enhanced")).toBeInTheDocument();
  });

  it("should not show AI indicator when not enhanced", () => {
    const issueNotEnhanced = {
      ...mockIssue,
      expanded_description: null,
    };

    render(<IssueItem issue={issueNotEnhanced} />);

    expect(screen.queryByTitle("AI Enhanced")).not.toBeInTheDocument();
  });

  it("should show PR number when linked to PR", () => {
    render(<IssueItem issue={mockIssue} />);

    expect(screen.getByText("PR #123")).toBeInTheDocument();
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

  it("should handle missing relationships gracefully", () => {
    const issueWithoutRelations = {
      ...mockIssue,
      project: null,
      repository: null,
      assigned_user: null,
    };

    render(<IssueItem issue={issueWithoutRelations} />);

    // Should still render without errors
    expect(screen.getByText("Fix authentication bug")).toBeInTheDocument();
    expect(screen.queryByText("Auth Module")).not.toBeInTheDocument();
  });

  it("should use issue ID when no GitHub issue number", () => {
    const issueWithoutGitHub = {
      ...mockIssue,
      github_issue_number: null,
    };

    render(<IssueItem issue={issueWithoutGitHub} />);

    expect(screen.getByText("#123e4567")).toBeInTheDocument();
  });
});