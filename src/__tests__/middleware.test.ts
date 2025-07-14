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

  it("allows access to /onboarding/profile without workspace check", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;
    const mockResponse = {} as NextResponse;

    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });

    const request = mockRequest("http://localhost:3000/onboarding/profile");
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding if authenticated user has no workspace", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;
    const mockResponse = {} as NextResponse;
    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === "workspace_members") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                then: vi.fn((callback) => {
                  callback({ data: [], error: null });
                  return Promise.resolve({ data: [], error: null });
                }),
              })),
            })),
          };
        }
        // For workspaces table
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      }),
    };

    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = mockRequest("http://localhost:3000/issues");
    await middleware(request);

    expect(mockSupabase.from).toHaveBeenCalledWith("workspace_members");
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("http://localhost:3000/onboarding/workspace"),
    );
  });

  it("allows access to protected routes if user has workspace", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;
    const mockResponse = {} as NextResponse;
    const mockSupabase = {
      from: vi.fn((table) => {
        if (table === "workspace_members") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                then: vi.fn((callback) => {
                  callback({
                    data: [{ workspace_id: "workspace-123" }],
                    error: null,
                  });
                  return Promise.resolve({
                    data: [{ workspace_id: "workspace-123" }],
                    error: null,
                  });
                }),
              })),
            })),
          };
        }
        // For workspaces table
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "workspace-123",
                    slug: "test-workspace",
                    name: "Test Workspace",
                  },
                ],
                error: null,
              }),
            ),
          })),
        };
      }),
    };

    vi.mocked(updateSession).mockResolvedValue({
      response: mockResponse,
      user: mockUser,
    });
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = mockRequest("http://localhost:3000/issues");
    await middleware(request);

    // The middleware should redirect to add the workspace slug
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      new URL("http://localhost:3000/test-workspace/issues"),
    );
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
      }),
    );
  });
});
