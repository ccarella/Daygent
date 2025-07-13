import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IssueList } from "../IssueList";
import type { Database } from "@/lib/database.types";

type Issue = Database["public"]["Tables"]["issues"]["Row"] & {
  repository: { id: string; name: string; full_name: string } | null;
};

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/issues",
  useSearchParams: () => mockSearchParams,
}));

const createMockIssue = (overrides: Partial<Issue> = {}): Issue => ({
  id: "123e4567-e89b-12d3-a456-426614174000",
  repository_id: "repo-1",
  workspace_id: "workspace-1",
  github_issue_number: 1,
  github_issue_id: null,
  github_node_id: null,
  title: "Test Issue",
  body: null,
  state: "open",
  author_github_login: null,
  assignee_github_login: null,
  labels: null,
  github_created_at: null,
  github_updated_at: null,
  github_closed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  repository: { id: "repo-1", name: "test-repo", full_name: "org/test-repo" },
  ...overrides,
});

describe("IssueList", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("should render list of issues", () => {
    const issues = [
      createMockIssue({ id: "1", title: "Issue 1", github_issue_number: 1 }),
      createMockIssue({ id: "2", title: "Issue 2", github_issue_number: 2 }),
      createMockIssue({ id: "3", title: "Issue 3", github_issue_number: 3 }),
    ];

    render(
      <IssueList
        issues={issues}
        totalCount={3}
        currentPage={1}
        totalPages={1}
      />
    );

    expect(screen.getByText("Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Issue 2")).toBeInTheDocument();
    expect(screen.getByText("Issue 3")).toBeInTheDocument();
  });

  it("should show empty state when no issues exist", () => {
    render(
      <IssueList issues={[]} totalCount={0} currentPage={1} totalPages={0} />
    );

    expect(
      screen.getByText("No issues found. Create your first issue to get started.")
    ).toBeInTheDocument();
  });

  it("should show filtered empty state when issues exist but filtered out", () => {
    render(
      <IssueList issues={[]} totalCount={10} currentPage={1} totalPages={1} />
    );

    expect(
      screen.getByText(
        "No issues match your filters. Try adjusting your search criteria."
      )
    ).toBeInTheDocument();
  });

  it("should show pagination info", () => {
    const issues = Array.from({ length: 25 }, (_, i) =>
      createMockIssue({ id: String(i), github_issue_number: i + 1 })
    );

    render(
      <IssueList
        issues={issues}
        totalCount={75}
        currentPage={2}
        totalPages={3}
      />
    );

    expect(screen.getByText("Showing 26 to 50 of 75 issues")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("should handle pagination navigation", async () => {
    const issues = Array.from({ length: 10 }, (_, i) =>
      createMockIssue({ id: String(i) })
    );

    const { user } = render(
      <IssueList
        issues={issues}
        totalCount={30}
        currentPage={2}
        totalPages={3}
      />
    );

    // Test next page
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(mockPush).toHaveBeenCalledWith("/issues?page=3");

    // Test previous page
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(mockPush).toHaveBeenCalledWith("/issues?page=1");

    // Test first page
    await user.click(screen.getByRole("button", { name: "First page" }));
    expect(mockPush).toHaveBeenCalledWith("/issues?page=1");

    // Test last page
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(mockPush).toHaveBeenCalledWith("/issues?page=3");
  });

  it("should disable pagination buttons appropriately", () => {
    const issues = Array.from({ length: 10 }, (_, i) =>
      createMockIssue({ id: String(i) })
    );

    // On first page
    const { rerender } = render(
      <IssueList
        issues={issues}
        totalCount={30}
        currentPage={1}
        totalPages={3}
      />
    );

    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).not.toBeDisabled();

    // On last page
    rerender(
      <IssueList
        issues={issues}
        totalCount={30}
        currentPage={3}
        totalPages={3}
      />
    );

    expect(
      screen.getByRole("button", { name: "First page" })
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
  });

  it("should preserve existing search params when navigating", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("status", "open");
    mockSearchParams.set("priority", "high");

    const issues = Array.from({ length: 10 }, (_, i) =>
      createMockIssue({ id: String(i) })
    );

    const { user } = render(
      <IssueList
        issues={issues}
        totalCount={30}
        currentPage={1}
        totalPages={3}
      />
    );

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(mockPush).toHaveBeenCalledWith(
      "/issues?status=open&priority=high&page=2"
    );
  });

  it("should not show pagination for single page", () => {
    const issues = Array.from({ length: 5 }, (_, i) =>
      createMockIssue({ id: String(i) })
    );

    render(
      <IssueList issues={issues} totalCount={5} currentPage={1} totalPages={1} />
    );

    expect(screen.queryByText("Page 1 of 1")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next page" })
    ).not.toBeInTheDocument();
  });
});