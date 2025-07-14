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

describe("IssuesEmptyState", () => {
  const mockWorkspaceId = "test-workspace-id";
  const mockWorkspaceSlug = "test-workspace";

  beforeEach(() => {
    vi.clearAllMocks();
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
      screen.getByRole("button", { name: /Import from repo-one/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Import from repo-two/i }),
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

    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });

    const { user } = render(
      <IssuesEmptyState
        workspaceId={mockWorkspaceId}
        workspaceSlug={mockWorkspaceSlug}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Import from repo-one/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /Import from repo-one/i }),
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
      expect(reloadMock).toHaveBeenCalled();
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
        screen.getByRole("button", { name: /Import from repo-one/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /Import from repo-one/i }),
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
        screen.getByRole("button", { name: /Import from repo-one/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /Import from repo-one/i }),
    );

    // Check loading state
    expect(screen.getByText(/Importing from repo-one.../i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Importing from repo-one.../i }),
    ).toBeDisabled();
  });
});
