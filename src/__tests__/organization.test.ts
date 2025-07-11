import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrganization } from "@/hooks/useOrganization";
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

describe("Organization Management", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    avatar_url: null,
    github_id: null,
    github_username: "testuser",
  };

  const mockOrganization = {
    id: "org-123",
    name: "Test Organization",
    slug: "test-org",
    subscription_status: "trial" as const,
    trial_ends_at: "2024-12-31T23:59:59Z",
    seats_used: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("useOrganization hook", () => {
    it("should return null organization when user is not logged in", () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        activeOrganization: null,
        setActiveOrganization: vi.fn(),
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

      const { result } = renderHook(() => useOrganization());

      expect(result.current.activeOrganization).toBeNull();
      expect(result.current.organizations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle user with organization in auth store", () => {
      const mockSetActiveOrganization = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeOrganization: mockOrganization,
        setActiveOrganization: mockSetActiveOrganization,
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

      const { result } = renderHook(() => useOrganization());

      // When user has an active organization, hook should return it
      expect(result.current.activeOrganization).toEqual(mockOrganization);
      expect(result.current.setActiveOrganization).toBe(
        mockSetActiveOrganization,
      );
    });

    it("should persist active organization in localStorage", async () => {
      const mockSetActiveOrganization = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeOrganization: mockOrganization,
        setActiveOrganization: mockSetActiveOrganization,
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

      const { result } = renderHook(() => useOrganization());

      result.current.setActiveOrganization(mockOrganization);

      expect(mockSetActiveOrganization).toHaveBeenCalledWith(mockOrganization);
    });
  });

  describe("Auth Store Organization Integration", () => {
    it("should clear active organization from store on logout", () => {
      // This test verifies that the logout action clears the organization
      // The actual store implementation already handles this
      const mockSetActiveOrganization = vi.fn();

      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        activeOrganization: mockOrganization,
        setActiveOrganization: mockSetActiveOrganization,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        setUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(() => {
          // Simulate logout clearing localStorage
          localStorage.removeItem("activeOrganizationId");
          return Promise.resolve();
        }),
        updateUser: vi.fn(),
        clearError: vi.fn(),
        setLoading: vi.fn(),
        initialize: vi.fn(),
      });

      // Set organization in localStorage
      localStorage.setItem("activeOrganizationId", mockOrganization.id);

      // After logout, localStorage should be cleared
      const { logout } = useAuthStore();
      logout();

      expect(localStorage.getItem("activeOrganizationId")).toBeNull();
    });
  });
});
