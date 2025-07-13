import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "../useUser";

// Mock the Supabase client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
    from: mockFrom,
  })),
}));

describe("useUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useUser());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it("should handle unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
  });

  it("should fetch user and profile data", async () => {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockGetUser.mockResolvedValue({
       
      data: { user: mockUser as any },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual({
      ...mockUser,
      profile: mockProfile,
    });
  });
});
