import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Mock the Supabase client
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  })),
}));

describe("useAuth", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
     
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
  });

  it("should sign in with GitHub", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: {
        url: "https://github.com/login/oauth/authorize",
        provider: "github",
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGitHub();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
        scopes: "repo read:user user:email",
      },
    });
  });

  it("should handle sign in error", async () => {
    const mockError = new Error("OAuth error");
    mockSignInWithOAuth.mockResolvedValue({
       
      data: null as any,
       
      error: mockError as any,
    });

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.signInWithGitHub();
      }),
    ).rejects.toThrow("OAuth error");
  });

  it("should sign out user", async () => {
    mockSignOut.mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/login");
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it("should get session", async () => {
    const mockSession = {
      access_token: "token",
      user: { id: "user-123" },
    };
    mockGetSession.mockResolvedValue({
       
      data: { session: mockSession as any },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    const session = await act(async () => {
      return await result.current.getSession();
    });

    expect(session).toEqual(mockSession);
  });

  it("should refresh session", async () => {
    const mockSession = {
      access_token: "new-token",
      user: { id: "user-123" },
    };
    mockRefreshSession.mockResolvedValue({
       
      data: { session: mockSession as any, user: mockSession.user as any },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    const session = await act(async () => {
      return await result.current.refreshSession();
    });

    expect(session).toEqual(mockSession);
  });
});
