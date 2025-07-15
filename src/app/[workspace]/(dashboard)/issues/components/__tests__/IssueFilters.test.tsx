import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IssueFilters } from "../IssueFilters";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/issues",
  useSearchParams: () => mockSearchParams,
}));

describe("IssueFilters", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("should render all filter controls", () => {
    render(<IssueFilters />);

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignee")).toBeInTheDocument();
    expect(screen.getByLabelText("AI Enhanced")).toBeInTheDocument();
  });

  it("should update URL when status filter changes", async () => {
    const { user } = render(<IssueFilters />);

    const statusSelect = screen.getByLabelText("Status");
    await user.click(statusSelect);
    await user.click(screen.getByText("In Progress"));

    expect(mockPush).toHaveBeenCalledWith("/issues?status=in_progress");
  });

  it("should update URL when priority filter changes", async () => {
    const { user } = render(<IssueFilters />);

    const prioritySelect = screen.getByLabelText("Priority");
    await user.click(prioritySelect);
    await user.click(screen.getByText("High"));

    expect(mockPush).toHaveBeenCalledWith("/issues?priority=high");
  });

  it("should show active filter count", () => {
    mockSearchParams.set("status", "open");
    mockSearchParams.set("priority", "high");

    render(<IssueFilters />);

    expect(screen.getByText("2 filters active")).toBeInTheDocument();
  });

  it("should clear all filters when clear button is clicked", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("status", "open");
    mockSearchParams.set("priority", "high");

    const { user } = render(<IssueFilters />);

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    expect(mockPush).toHaveBeenCalledWith("/issues");
  });

  it("should toggle enhanced filter when checkbox is clicked", async () => {
    mockSearchParams = new URLSearchParams();

    const { user } = render(<IssueFilters />);

    const enhancedCheckbox = screen.getByRole("checkbox", {
      name: /AI Enhanced/i,
    });
    await user.click(enhancedCheckbox);

    expect(mockPush).toHaveBeenCalledWith("/issues?enhanced=true");
  });

  it("should remove filter when set to 'all'", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("status", "open");

    const { user } = render(<IssueFilters />);

    const statusSelect = screen.getByLabelText("Status");
    await user.click(statusSelect);
    await user.click(screen.getByText("All Statuses"));

    expect(mockPush).toHaveBeenCalledWith("/issues");
  });

  it("should reset page when filters change", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("page", "3");

    const { user } = render(<IssueFilters />);

    const statusSelect = screen.getByLabelText("Status");
    await user.click(statusSelect);
    await user.click(screen.getByText("Open"));

    // Should not include page parameter
    expect(mockPush).toHaveBeenCalledWith("/issues?status=open");
  });
});
