import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Mock dependencies
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: "redirect", url: url.toString() })),
  },
  NextRequest: vi.fn(),
}));

describe("Middleware - Onboarding Flow", () => {
  const mockRequest = (url: string) => {
    return {
      url,
      nextUrl: new URL(url),
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
      },
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("allows access to /onboarding without organization check", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockResponse = {} as NextResponse;
    
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });

    const request = mockRequest("http://localhost:3000/onboarding");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding if authenticated user has no workspace", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockResponse = {} as NextResponse;
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase as ReturnType<typeof createServerClient>
    );

    const request = mockRequest("http://localhost:3000/issues");
    await middleware(request);

    expect(mockSupabase.from).toHaveBeenCalledWith("workspace_members");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("http://localhost:3000/onboarding")
    );
  });

  it("allows access to protected routes if user has workspace", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockResponse = {} as NextResponse;
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ workspace_id: "workspace-123" }],
        error: null,
      }),
    };

    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });
    vi.mocked(createServerClient).mockReturnValue(
      mockSupabase as ReturnType<typeof createServerClient>
    );

    const request = mockRequest("http://localhost:3000/issues");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", async () => {
    const mockResponse = {} as NextResponse;
    
    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: null,
    });

    const request = mockRequest("http://localhost:3000/issues");
    await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/login",
      })
    );
  });
});