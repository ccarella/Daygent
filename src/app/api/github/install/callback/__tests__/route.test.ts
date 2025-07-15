import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/github-app/config", () => ({
  getGitHubAppConfig: vi.fn(() => ({
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
  })),
}));

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    redirect: vi.fn((url) => ({ type: "redirect", url: url.toString() })),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("GitHub Install Callback Route", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it("redirects to workspace issues page on successful installation", async () => {
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          installation_id: "12345",
          code: "test-code",
          state: "workspace-123:csrf-token",
        }),
      },
      url: "http://localhost:3000/api/github/install/callback",
    } as unknown as NextRequest;

    // Mock user authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock workspace membership check
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { workspace_id: "workspace-123" },
              error: null,
            })),
          })),
        })),
      })),
    }));
    mockSupabase.from.mockImplementation(mockFrom);

    // Mock GitHub token exchange
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-access-token" }),
      })
      // Mock GitHub installation details
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          account: {
            login: "test-org",
            type: "Organization",
          },
        }),
      });

    // Mock upsert for GitHub installation
    mockSupabase.from.mockImplementationOnce(() => ({
      upsert: vi.fn(() => ({
        error: null,
      })),
    }));

    // Mock workspace slug lookup
    mockSupabase.from.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { slug: "test-workspace" },
            error: null,
          })),
        })),
      })),
    }));

    const response = await GET(mockRequest);

    expect(response).toEqual({
      type: "redirect",
      url: "http://localhost:3000/test-workspace/issues",
    });
  });

  it("redirects with error when parameters are missing", async () => {
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          installation_id: "12345",
          // Missing code and state
        }),
      },
      url: "http://localhost:3000/api/github/install/callback",
    } as unknown as NextRequest;

    const response = await GET(mockRequest);

    expect(response.url).toContain("/?error=missing_params");
  });

  it("redirects to workspace-specific error page when available", async () => {
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          installation_id: "12345",
          code: "test-code",
          state: "workspace-123:csrf-token",
        }),
      },
      url: "http://localhost:3000/api/github/install/callback",
    } as unknown as NextRequest;

    // Mock user authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock workspace membership check - user not a member
    mockSupabase.from.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { code: "PGRST116" },
            })),
          })),
        })),
      })),
    }));

    // Mock workspace slug lookup
    mockSupabase.from.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { slug: "test-workspace" },
            error: null,
          })),
        })),
      })),
    }));

    const response = await GET(mockRequest);

    expect(response).toEqual({
      type: "redirect",
      url: "http://localhost:3000/test-workspace/settings/github?error=invalid_workspace",
    });
  });

  it("handles GitHub token exchange failure", async () => {
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          installation_id: "12345",
          code: "test-code",
          state: "workspace-123:csrf-token",
        }),
      },
      url: "http://localhost:3000/api/github/install/callback",
    } as unknown as NextRequest;

    // Mock user authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Mock workspace membership check
    mockSupabase.from.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { workspace_id: "workspace-123" },
              error: null,
            })),
          })),
        })),
      })),
    }));

    // Mock failed GitHub token exchange
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => "Token exchange failed",
    });

    // Mock workspace slug lookup
    mockSupabase.from.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { slug: "test-workspace" },
            error: null,
          })),
        })),
      })),
    }));

    const response = await GET(mockRequest);

    expect(response.url).toContain(
      "/test-workspace/settings/github?error=token_exchange_failed",
    );
  });
});
