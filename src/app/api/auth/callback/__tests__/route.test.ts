import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ url: url.toString() })),
  },
}));

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
} as any;

describe("Auth Callback Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it("should redirect to login with error when no code is provided", async () => {
    const request = new Request("http://localhost:3000/auth/callback");

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/login?error=no_code", "http://localhost:3000"),
    );
  });

  it("should redirect to login with error when code exchange fails", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code",
    );

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: new Error("Exchange failed"),
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/login?error=auth_failed", "http://localhost:3000"),
    );
  });

  it("should redirect to profile onboarding for new users", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code",
    );

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    });

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Mock profile query - no profile exists
    const profileQuery = {
      data: null,
      error: null,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(profileQuery)),
        })),
      })),
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/onboarding/profile", "http://localhost:3000"),
    );
  });

  it("should redirect to workspace onboarding for users without workspace", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code",
    );

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    });

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Mock profile query - profile exists
    const profileQuery = {
      data: { id: "user-123", email: "test@example.com" },
      error: null,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(profileQuery)),
        })),
      })),
    });

    // Mock workspace query - no workspaces
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/onboarding/workspace", "http://localhost:3000"),
    );
  });

  it("should redirect to dashboard for users with workspace", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code",
    );

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    });

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Mock profile query - profile exists
    const profileQuery = {
      data: { id: "user-123", email: "test@example.com" },
      error: null,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(profileQuery)),
        })),
      })),
    });

    // Mock workspace query - has workspace
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() =>
            Promise.resolve({
              data: [{ workspace_id: "workspace-123" }],
              error: null,
            }),
          ),
        })),
      })),
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/dashboard", "http://localhost:3000"),
    );
  });

  it("should redirect to custom next URL when provided", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code&next=/issues",
    );

    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    });

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Mock profile query - profile exists
    const profileQuery = {
      data: { id: "user-123", email: "test@example.com" },
      error: null,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(profileQuery)),
        })),
      })),
    });

    // Mock workspace query - has workspace
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() =>
            Promise.resolve({
              data: [{ workspace_id: "workspace-123" }],
              error: null,
            }),
          ),
        })),
      })),
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("/issues", "http://localhost:3000"),
    );
  });
});
