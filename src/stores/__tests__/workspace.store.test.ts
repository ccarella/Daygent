import { renderHook, act } from "@testing-library/react";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { createClient } from "@/lib/supabase/client";
import { mockWorkspace, mockUser } from "@/test/fixtures/workspace";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client");

describe("Workspace Store", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase);

    // Reset store
    const { result } = renderHook(() => useWorkspaceStore());
    act(() => {
      result.current.reset();
    });

    // Clear localStorage
    localStorage.clear();
  });

  it("loads user workspaces", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ workspace_id: "workspace-123", workspaces: mockWorkspace }],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    await act(async () => {
      await result.current.loadWorkspaces();
    });

    expect(result.current.workspaces).toHaveLength(1);
    expect(result.current.workspaces[0]).toEqual(mockWorkspace);
    expect(result.current.currentWorkspace).toEqual(mockWorkspace);
  });

  it("handles load workspaces error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Failed to fetch"),
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    await act(async () => {
      await result.current.loadWorkspaces();
    });

    expect(result.current.workspaces).toEqual([]);
    expect(result.current.error).toBe("Failed to fetch");
  });

  it("creates a new workspace", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const newWorkspace = {
      ...mockWorkspace,
      id: "workspace-456",
      name: "New Workspace",
      slug: "new-workspace",
    };

    mockSupabase.rpc.mockResolvedValue({
      data: [newWorkspace],
      error: null,
    });

    // Mock for loadWorkspaces call after creation
    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { workspace_id: "workspace-123", workspaces: mockWorkspace },
          { workspace_id: "workspace-456", workspaces: newWorkspace },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    let createdWorkspace;
    await act(async () => {
      createdWorkspace = await result.current.createWorkspace({
        name: "New Workspace",
        slug: "new-workspace",
      });
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "create_workspace_with_member",
      {
        p_name: "New Workspace",
        p_slug: "new-workspace",
        p_user_id: mockUser.id,
      },
    );
    expect(createdWorkspace).toEqual(newWorkspace);
    expect(result.current.currentWorkspace).toEqual(newWorkspace);
  });

  it("handles create workspace error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: new Error("Slug already exists"),
    });

    const { result } = renderHook(() => useWorkspaceStore());

    let error: Error | undefined;
    try {
      await act(async () => {
        await result.current.createWorkspace({
          name: "Test Workspace",
          slug: "taken-slug",
        });
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error?.message).toBe("Slug already exists");
    expect(result.current.error).toBe("Slug already exists");
  });

  it("switches between workspaces", async () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const workspace2 = {
      ...mockWorkspace,
      id: "workspace-456",
      name: "Other Workspace",
    };

    // Set initial workspaces
    act(() => {
      result.current.workspaces = [mockWorkspace, workspace2];
      result.current.setCurrentWorkspace(mockWorkspace);
    });

    expect(result.current.currentWorkspace?.id).toBe("workspace-123");

    await act(async () => {
      await result.current.switchWorkspace("workspace-456");
    });

    expect(result.current.currentWorkspace?.id).toBe("workspace-456");
  });

  it("loads workspace when switching to unknown workspace", async () => {
    const newWorkspace = {
      ...mockWorkspace,
      id: "workspace-789",
      name: "Remote Workspace",
    };

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: newWorkspace,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    await act(async () => {
      await result.current.switchWorkspace("workspace-789");
    });

    expect(result.current.currentWorkspace).toEqual(newWorkspace);
    expect(result.current.workspaces).toContainEqual(newWorkspace);
  });

  it("refreshes current workspace", async () => {
    const updatedWorkspace = {
      ...mockWorkspace,
      name: "Updated Workspace Name",
    };

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedWorkspace,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    // Set initial workspace
    act(() => {
      result.current.workspaces = [mockWorkspace];
      result.current.setCurrentWorkspace(mockWorkspace);
    });

    await act(async () => {
      await result.current.refreshCurrentWorkspace();
    });

    expect(result.current.currentWorkspace).toEqual(updatedWorkspace);
    expect(result.current.workspaces[0]).toEqual(updatedWorkspace);
  });

  it("persists current workspace to localStorage", () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.setCurrentWorkspace(mockWorkspace);
    });

    expect(localStorage.getItem("currentWorkspaceId")).toBe("workspace-123");
  });

  it("restores workspace from localStorage on load", async () => {
    localStorage.setItem("currentWorkspaceId", "workspace-456");

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const workspace2 = {
      ...mockWorkspace,
      id: "workspace-456",
      name: "Saved Workspace",
    };

    const mockFrom = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { workspace_id: "workspace-123", workspaces: mockWorkspace },
          { workspace_id: "workspace-456", workspaces: workspace2 },
        ],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockFrom);

    const { result } = renderHook(() => useWorkspaceStore());

    await act(async () => {
      await result.current.loadWorkspaces();
    });

    expect(result.current.currentWorkspace?.id).toBe("workspace-456");
  });

  it("resets store state", () => {
    const { result } = renderHook(() => useWorkspaceStore());

    act(() => {
      result.current.workspaces = [mockWorkspace];
      result.current.setCurrentWorkspace(mockWorkspace);
      result.current.error = "Some error";
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.workspaces).toEqual([]);
    expect(result.current.currentWorkspace).toBeNull();
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem("currentWorkspaceId")).toBeNull();
  });
});
