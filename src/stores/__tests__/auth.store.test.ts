import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client", () => {
  const mockSignInWithOAuth = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetUser = vi.fn();
  const mockGetSession = vi.fn();
  const mockFrom = vi.fn();
  const mockOnAuthStateChange = vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  }));

  const mockSupabaseClient = {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  };

  return {
    createClient: vi.fn(() => mockSupabaseClient),
    // Export mocks for test access
    __mockSignInWithOAuth: mockSignInWithOAuth,
    __mockSignOut: mockSignOut,
    __mockGetUser: mockGetUser,
    __mockGetSession: mockGetSession,
    __mockFrom: mockFrom,
    __mockOnAuthStateChange: mockOnAuthStateChange,
  };
});

// Import after mocking
import { useAuthStore } from "../auth.store";
import * as supabaseClient from "@/lib/supabase/client";

// Get the mock functions
const {
  __mockSignInWithOAuth: mockSignInWithOAuth,
  __mockSignOut: mockSignOut,
  __mockGetUser: mockGetUser,
  __mockGetSession: mockGetSession,
  __mockFrom: mockFrom,
} = supabaseClient as any;

// Helper function to create a test user with all required properties
const createTestUser = (overrides = {}) => ({
  id: "1",
  email: "test@example.com",
  name: "Test User",
  avatar_url: null,
  github_id: null,
  github_username: null,
  google_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Auth Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it("should have correct initial state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle OAuth login without redirectTo (backward compatibility)", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://github.com/login", provider: "github" },
      error: null,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
        scopes: "repo read:user user:email",
      },
    });
    // Should not have next parameter when no redirectTo is provided
    expect(
      mockSignInWithOAuth.mock.calls[0][0].options.redirectTo,
    ).not.toContain("next=");
  });

  it("should handle OAuth login with redirectTo parameter", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://github.com/login", provider: "github" },
      error: null,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login("/dashboard");
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: expect.stringContaining("/auth/callback?next=%2Fdashboard"),
        scopes: "repo read:user user:email",
      },
    });
  });

  it("should properly encode redirectTo parameter", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://github.com/login", provider: "github" },
      error: null,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login("/settings?tab=profile");
    });

    // The URL should be properly encoded
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: expect.stringContaining(
          "/auth/callback?next=%2Fsettings%3Ftab%3Dprofile",
        ),
        scopes: "repo read:user user:email",
      },
    });
  });

  it("should handle login error", async () => {
    const mockError = new Error("OAuth failed");
    mockSignInWithOAuth.mockResolvedValue({
      data: null as any,
      error: mockError as any,
    });

    const { result } = renderHook(() => useAuthStore());

    await expect(
      act(async () => {
        await result.current.login();
      }),
    ).rejects.toThrow("OAuth failed");

    expect(result.current.error).toBe("OAuth failed");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should handle logout", async () => {
    mockSignOut.mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuthStore());

    // Set user first
    act(() => {
      result.current.setUser(createTestUser());
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should update user data", () => {
    const { result } = renderHook(() => useAuthStore());

    // Set initial user
    act(() => {
      result.current.setUser(createTestUser());
    });

    // Update user
    act(() => {
      result.current.updateUser({
        name: "Updated Name",
        avatar_url: "https://example.com/avatar.jpg",
      });
    });

    expect(result.current.user).toEqual(
      createTestUser({
        name: "Updated Name",
        avatar_url: "https://example.com/avatar.jpg",
      }),
    );
  });

  it("should initialize auth state", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      user_metadata: {
        avatar_url: "https://example.com/avatar.jpg",
      },
    };

    const mockProfile = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      github_id: 12345,
      github_username: "testuser",
    };

    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: Date.now() / 1000 + 3600 } },
      error: null,
    });

    mockGetUser.mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: mockProfile, error: null }),
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.user).toEqual(
      createTestUser({
        id: "user-123",
        name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
        github_id: 12345,
        github_username: "testuser",
      }),
    );
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should clear errors", () => {
    const { result } = renderHook(() => useAuthStore());

    // Set an error using act
    act(() => {
      useAuthStore.setState({ error: "Test error" });
    });

    expect(result.current.error).toBe("Test error");

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should handle loading state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("should set user and authentication state", () => {
    const { result } = renderHook(() => useAuthStore());
    const testUser = createTestUser({
      id: "123",
      email: "user@example.com",
      avatar_url: "https://example.com/avatar.jpg",
      github_id: 12345,
      github_username: "testuser",
    });

    act(() => {
      result.current.setUser(testUser);
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
