import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRepositories } from "../useRepositories";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../useWorkspace", () => ({
  useWorkspace: vi.fn(() => ({
    activeWorkspace: {
      id: "ws-123",
      name: "Test Workspace",
    },
  })),
}));

const mockRepositoriesResponse = {
  repositories: [
    {
      id: 1,
      name: "test-repo-1",
      full_name: "testuser/test-repo-1",
      private: false,
      description: "Test repository 1",
      default_branch: "main",
      html_url: "https://github.com/testuser/test-repo-1",
      updated_at: "2024-01-01T00:00:00Z",
      owner: {
        login: "testuser",
        avatar_url: "https://github.com/avatar.jpg",
        type: "User",
      },
      is_connected: false,
    },
    {
      id: 2,
      name: "test-repo-2",
      full_name: "testuser/test-repo-2",
      private: true,
      description: "Test repository 2",
      default_branch: "main",
      html_url: "https://github.com/testuser/test-repo-2",
      updated_at: "2024-01-02T00:00:00Z",
      owner: {
        login: "testuser",
        avatar_url: "https://github.com/avatar.jpg",
        type: "User",
      },
      is_connected: true,
    },
  ],
  pagination: {
    page: 1,
    per_page: 30,
    has_next: false,
    has_prev: false,
  },
};

describe("useRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockRepositoriesResponse,
    });
  });

  it("should fetch repositories on mount", async () => {
    const { result } = renderHook(() => useRepositories());

    await waitFor(() => {
      expect(result.current.repositories).toHaveLength(2);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/repositories?page=1&per_page=30&workspace_id=ws-123",
      ),
    );
  });

  it("should handle repository selection", () => {
    const { result } = renderHook(() => useRepositories());

    act(() => {
      result.current.toggleRepoSelection(1);
    });

    expect(result.current.selectedRepos.has(1)).toBe(true);

    act(() => {
      result.current.toggleRepoSelection(1);
    });

    expect(result.current.selectedRepos.has(1)).toBe(false);
  });

  it("should select all unconnected repositories", async () => {
    const { result } = renderHook(() => useRepositories());

    await waitFor(() => {
      expect(result.current.repositories).toHaveLength(2);
    });

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedRepos.size).toBe(1);
    expect(result.current.selectedRepos.has(1)).toBe(true);
    expect(result.current.selectedRepos.has(2)).toBe(false);
  });

  it("should deselect all repositories", async () => {
    const { result } = renderHook(() => useRepositories());

    await waitFor(() => {
      expect(result.current.repositories).toHaveLength(2);
    });

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedRepos.size).toBe(1);

    act(() => {
      result.current.deselectAll();
    });

    expect(result.current.selectedRepos.size).toBe(0);
  });

  it("should handle search query", async () => {
    const { result } = renderHook(() => useRepositories());

    act(() => {
      result.current.setSearchQuery("test");
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=test"),
      );
    });
  });

  it("should connect selected repositories", async () => {
    const { result } = renderHook(() => useRepositories());

    await waitFor(() => {
      expect(result.current.repositories).toHaveLength(2);
    });

    act(() => {
      result.current.toggleRepoSelection(1);
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Repositories connected successfully",
          connected: 1,
          repositories: [{ id: "repo-uuid-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepositoriesResponse,
      });

    await act(async () => {
      await result.current.connectSelectedRepositories();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/repositories/connect",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: "ws-123",
            repositories: [
              {
                github_id: 1,
                name: "test-repo-1",
                full_name: "testuser/test-repo-1",
                private: false,
                default_branch: "main",
              },
            ],
          }),
        }),
      );
    });

    expect(result.current.selectedRepos.size).toBe(0);
  });

  it("should handle API errors", async () => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to fetch repositories" }),
    });

    const { result } = renderHook(() => useRepositories());

    await waitFor(
      () => {
        expect(result.current.error).toBe("Failed to fetch repositories");
      },
      { timeout: 3000 },
    );
  });

  it("should handle pagination", async () => {
    const { result } = renderHook(() => useRepositories());

    await waitFor(() => {
      expect(result.current.repositories).toHaveLength(2);
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepositoriesResponse,
    });

    await act(async () => {
      await result.current.fetchRepositories(2);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("page=2"),
      );
    });
  });
});
