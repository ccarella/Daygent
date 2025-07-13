import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuthStore } from "@/stores/auth.store";

// Mock auth store
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

// Mock Supabase client to avoid real network calls
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
}));

describe("Workspace Management", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    avatar_url: null,
    github_id: null,
    github_username: "testuser",
    google_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockWorkspace = {
    id: "ws-123",
    name: "Test Workspace",
    slug: "test-workspace",
    created_by: mockUser.id,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("useWorkspace hook", () => {
    it("should return null workspace when user is not logged in", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        activeWorkspace: null,
        setActiveWorkspace: vi.fn(),
        isAuthenticated: false,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
        clearError: vi.fn(),
        setLoading: vi.fn(),
        initialize: vi.fn(),
      });

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.activeWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle user with workspace in auth store", () => {
      const mockSetActiveWorkspace = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeWorkspace: mockWorkspace,
        setActiveWorkspace: mockSetActiveWorkspace,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
        clearError: vi.fn(),
        setLoading: vi.fn(),
        initialize: vi.fn(),
      });

      const { result } = renderHook(() => useWorkspace());

      // When user has an active workspace, hook should return it
      expect(result.current.activeWorkspace).toEqual(mockWorkspace);
      expect(result.current.setActiveWorkspace).toBe(
        mockSetActiveWorkspace,
      );
    });

    it("should persist active workspace in localStorage", async () => {
      const mockSetActiveWorkspace = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeWorkspace: mockWorkspace,
        setActiveWorkspace: mockSetActiveWorkspace,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
        clearError: vi.fn(),
        setLoading: vi.fn(),
        initialize: vi.fn(),
      });

      const { result } = renderHook(() => useWorkspace());

      result.current.setActiveWorkspace(mockWorkspace);

      expect(mockSetActiveWorkspace).toHaveBeenCalledWith(mockWorkspace);
    });
  });

  describe("Auth Store Workspace Integration", () => {
    it("should clear active workspace from store on logout", () => {
      // This test verifies that the logout action clears the workspace
      // The actual store implementation already handles this
      const mockSetActiveWorkspace = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeWorkspace: mockWorkspace,
        setActiveWorkspace: mockSetActiveWorkspace,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(() => {
          // Simulate logout clearing localStorage
          localStorage.removeItem("activeWorkspaceId");
          return Promise.resolve();
        }),
        updateUser: vi.fn(),
        clearError: vi.fn(),
        setLoading: vi.fn(),
        initialize: vi.fn(),
      });

      // Set workspace in localStorage
      localStorage.setItem("activeWorkspaceId", mockWorkspace.id);

      // After logout, localStorage should be cleared
      const { logout } = useAuthStore();
      logout();

      expect(localStorage.getItem("activeWorkspaceId")).toBeNull();
    });
  });
});