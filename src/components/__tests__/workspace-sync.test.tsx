import { render, waitFor } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { WorkspaceSync } from "@/components/workspace-sync";
import { useWorkspaceStore } from "@/stores/workspace.store";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock workspace store
vi.mock("@/stores/workspace.store", () => ({
  useWorkspaceStore: vi.fn(),
}));

describe("WorkspaceSync", () => {
  const mockRouter = {
    replace: vi.fn(),
  };

  const mockWorkspaceStore = {
    setWorkspaceBySlug: vi.fn(),
    loadWorkspaces: vi.fn(),
    workspaces: [],
    currentWorkspace: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
    (useWorkspaceStore as any).mockReturnValue(mockWorkspaceStore);
    // Also mock getState
    (useWorkspaceStore as any).getState = vi.fn().mockReturnValue(mockWorkspaceStore);
  });

  it("should sync workspace when navigating to a workspace URL", async () => {
    (usePathname as any).mockReturnValue("/daygen/issues");
    mockWorkspaceStore.setWorkspaceBySlug.mockResolvedValue(true);
    mockWorkspaceStore.workspaces = [
      { id: "1", slug: "daygen", name: "Daygen" },
    ];

    render(<WorkspaceSync />);

    await waitFor(() => {
      expect(mockWorkspaceStore.setWorkspaceBySlug).toHaveBeenCalledWith("daygen");
    });
  });

  it("should load workspaces if none are loaded", async () => {
    (usePathname as any).mockReturnValue("/daygen/issues");
    mockWorkspaceStore.workspaces = [];
    mockWorkspaceStore.loadWorkspaces.mockResolvedValue(undefined);
    mockWorkspaceStore.setWorkspaceBySlug.mockResolvedValue(true);

    render(<WorkspaceSync />);

    await waitFor(() => {
      expect(mockWorkspaceStore.loadWorkspaces).toHaveBeenCalled();
      expect(mockWorkspaceStore.setWorkspaceBySlug).toHaveBeenCalledWith("daygen");
    });
  });

  it("should redirect to first workspace if slug not found", async () => {
    (usePathname as any).mockReturnValue("/invalid/issues");
    mockWorkspaceStore.setWorkspaceBySlug.mockResolvedValue(false);
    mockWorkspaceStore.workspaces = [
      { id: "1", slug: "daygen", name: "Daygen" },
    ];
    (useWorkspaceStore as any).getState.mockReturnValue({
      ...mockWorkspaceStore,
      workspaces: [{ id: "1", slug: "daygen", name: "Daygen" }],
    });

    render(<WorkspaceSync />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/daygen/issues");
    });
  });

  it("should redirect to login if no workspaces available", async () => {
    (usePathname as any).mockReturnValue("/invalid/issues");
    mockWorkspaceStore.setWorkspaceBySlug.mockResolvedValue(false);
    mockWorkspaceStore.workspaces = [];
    (useWorkspaceStore as any).getState.mockReturnValue({
      ...mockWorkspaceStore,
      workspaces: [],
    });

    render(<WorkspaceSync />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("should not sync if current workspace matches URL", () => {
    (usePathname as any).mockReturnValue("/daygen/issues");
    mockWorkspaceStore.currentWorkspace = { id: "1", slug: "daygen", name: "Daygen" };
    mockWorkspaceStore.workspaces = [
      { id: "1", slug: "daygen", name: "Daygen" },
    ];

    render(<WorkspaceSync />);

    expect(mockWorkspaceStore.setWorkspaceBySlug).not.toHaveBeenCalled();
  });

  it("should handle empty pathname gracefully", () => {
    (usePathname as any).mockReturnValue("/");

    render(<WorkspaceSync />);

    expect(mockWorkspaceStore.setWorkspaceBySlug).not.toHaveBeenCalled();
    expect(mockWorkspaceStore.loadWorkspaces).not.toHaveBeenCalled();
  });
});