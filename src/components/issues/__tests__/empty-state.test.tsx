import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { IssuesEmptyState } from "../empty-state";
import { toast } from "sonner";

// Mock Supabase client
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock Next.js router
const mockRouter = {
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

describe("IssuesEmptyState", () => {
  const mockWorkspaceId = "test-workspace-id";
  const mockWorkspaceSlug = "test-workspace";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.refresh.mockClear();
  });

  it("should show loading state initially", () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          data: null,
          error: null,
        }),
      }),
    });

    render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    // Check for loading spinner by looking for the animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should show 'Connect a repository first' when no repositories exist", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Connect a repository first"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "You need to connect GitHub repositories before you can import issues.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Connect Repositories/i }),
    ).toHaveAttribute("href", "/test-workspace/settings/repositories");
  });

  it("should show 'No issues yet' with import buttons when repositories exist", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
      { id: "repo-2", name: "repo-two", full_name: "org/repo-two" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No issues yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Import issues from your GitHub repositories to get started",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Import issues from repo-two repository",
      }),
    ).toBeInTheDocument();
  });

  it("should handle repository loading error", async () => {
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: null,
          error: new Error("Failed to load repositories"),
        }),
      }),
    });

    render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load repositories");
    });
  });

  it("should handle successful sync", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    // Mock successful sync response
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        synced: 10,
        updated: 0,
        cursor: null,
      }),
    } as Response);

    // Router refresh will be called after successful sync

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Import issues from repo-one repository",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/repositories/repo-1/sync-issues",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ full_sync: true }),
        },
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully imported 10 issues",
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it("should handle sync error", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    // Mock failed sync response
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Sync already in progress" }),
    } as Response);

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Import issues from repo-one repository",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Sync already in progress");
    });
  });

  it("should show loading state during sync", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    // Mock a delayed response
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                synced: 5,
                updated: 0,
                cursor: null,
              }),
            } as Response);
          }, 100);
        }),
    );

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Import issues from repo-one repository",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    );

    // Check loading state
    expect(screen.getByText(/Importing from repo-one.../i)).toBeInTheDocument();
    // The button should still have the same aria-label but be disabled
    expect(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    ).toBeDisabled();
  });

  it("should handle rate limit errors with specific message", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    // Mock rate limit response
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Rate limit exceeded" }),
    } as Response);

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Import issues from repo-one repository",
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "GitHub rate limit exceeded. Please try again later.",
      );
    });
  });

  it("should disable all buttons when any sync is in progress", async () => {
    const mockRepositories = [
      { id: "repo-1", name: "repo-one", full_name: "org/repo-one" },
      { id: "repo-2", name: "repo-two", full_name: "org/repo-two" },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockResolvedValue({
          data: mockRepositories,
          error: null,
        }),
      }),
    });

    // Mock a delayed response
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                synced: 5,
                updated: 0,
                cursor: null,
              }),
            } as Response);
          }, 100);
        }),
    );

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Import issues from repo-one repository",
        }),
      ).toBeInTheDocument();
    });

    // Click the first button
    await user.click(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    );

    // Check that both buttons are disabled
    // The syncing button should show loading text
    expect(screen.getByText(/Importing from repo-one.../i)).toBeInTheDocument();
    // Both buttons should be disabled (checking by aria-label)
    expect(
      screen.getByRole("button", {
        name: "Import issues from repo-one repository",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Import issues from repo-two repository",
      }),
    ).toBeDisabled();
  });
});
