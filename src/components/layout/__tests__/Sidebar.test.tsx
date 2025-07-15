import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { useWorkspaceStore } from "@/stores/workspace.store";

// Mock the workspace store
vi.mock("@/stores/workspace.store", () => ({
  useWorkspaceStore: vi.fn(),
}));

// Mock the auth store (used by UserMenu)
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: {
      id: "1",
      email: "test@example.com",
      user_metadata: { full_name: "Test User" },
    },
    logout: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/issues",
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Sidebar", () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays workspace name when workspace is available and sidebar is open", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: {
        id: "1",
        name: "Test Workspace",
        slug: "test-workspace",
      },
    });

    render(<Sidebar isOpen={true} onToggle={mockToggle} pathname="/issues" />);

    expect(screen.getByText("Test Workspace")).toBeInTheDocument();
  });

  it("hides workspace name when sidebar is collapsed", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: {
        id: "1",
        name: "Test Workspace",
        slug: "test-workspace",
      },
    });

    render(<Sidebar isOpen={false} onToggle={mockToggle} pathname="/issues" />);

    const workspaceName = screen.getByText("Test Workspace");
    expect(workspaceName).toHaveClass("opacity-0");
  });

  it("displays 'No Workspace Selected' when no workspace is available", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: null,
    });

    render(<Sidebar isOpen={true} onToggle={mockToggle} pathname="/issues" />);

    expect(screen.getByText("No Workspace Selected")).toBeInTheDocument();
    expect(screen.queryByText("Test Workspace")).not.toBeInTheDocument();
  });

  it("hides 'No Workspace Selected' text when sidebar is collapsed", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: null,
    });

    render(<Sidebar isOpen={false} onToggle={mockToggle} pathname="/issues" />);

    const noWorkspaceText = screen.getByText("No Workspace Selected");
    expect(noWorkspaceText).toHaveClass("opacity-0");
  });

  it("renders navigation and user menu sections", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: {
        id: "1",
        name: "Test Workspace",
        slug: "test-workspace",
      },
    });

    render(<Sidebar isOpen={true} onToggle={mockToggle} pathname="/issues" />);

    // Check for navigation items
    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("displays toggle button with correct aria-label", () => {
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: null,
    });

    const { rerender } = render(
      <Sidebar isOpen={true} onToggle={mockToggle} pathname="/issues" />
    );

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" })
    ).toBeInTheDocument();

    rerender(<Sidebar isOpen={false} onToggle={mockToggle} pathname="/issues" />);

    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toBeInTheDocument();
  });
});