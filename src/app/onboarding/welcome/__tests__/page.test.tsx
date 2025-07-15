import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import WelcomePage from "../page";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/stores/workspace.store", () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "test-workspace-id", slug: "test-workspace" },
              }),
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe("WelcomePage", () => {
  const mockPush = vi.fn();
  const mockLoadWorkspaces = vi.fn();
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: { id: "test-workspace-id", slug: "test-workspace" },
      workspaces: [{ id: "test-workspace-id", slug: "test-workspace" }],
      loadWorkspaces: mockLoadWorkspaces.mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("renders the first slide correctly", async () => {
    await act(async () => {
      render(<WelcomePage />);
    });

    expect(screen.getByText("Welcome to Daygent")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Daygent is an app to manage Software Engineering Agents/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("navigates through slides when clicking next", async () => {
    await act(async () => {
      render(<WelcomePage />);
    });

    // Wait for initial load
    await waitFor(() => {
      expect(mockLoadWorkspaces).toHaveBeenCalled();
    });

    const nextButton = screen.getByRole("button", { name: /next/i });

    // Click to second slide
    await act(async () => {
      fireEvent.click(nextButton);
    });
    expect(screen.getByText("AI-Powered Development")).toBeInTheDocument();

    // Click to third slide
    await act(async () => {
      fireEvent.click(nextButton);
    });
    expect(screen.getByText("GitHub Integration")).toBeInTheDocument();

    // Wait for button to be enabled after workspace loads
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /connect with github/i }),
      ).toBeEnabled();
    });
  });

  it("initiates GitHub App installation on final slide", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        install_url: "https://github.com/apps/test-app/installations/new",
      }),
    });

    // Mock window.location
    delete (window as any).location;
    window.location = { href: "" } as any;

    render(<WelcomePage />);

    // Wait for workspace to load
    await waitFor(() => {
      expect(mockLoadWorkspaces).toHaveBeenCalled();
    });

    // Navigate to last slide
    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /connect with github/i }),
      ).toBeEnabled();
    });

    // Click Connect with GitHub
    const connectButton = screen.getByRole("button", {
      name: /connect with github/i,
    });
    fireEvent.click(connectButton);

    // Should show loading state
    expect(screen.getByText("Connecting...")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/github/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "test-workspace-id",
        }),
      });
    });

    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://github.com/apps/test-app/installations/new",
      );
    });
  });

  it("redirects to workspace creation if no workspace found", async () => {
    // Mock no workspaces
    (useWorkspaceStore as any).mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      loadWorkspaces: mockLoadWorkspaces.mockResolvedValue(undefined),
    });

    // Mock createClient to return no workspace memberships
    const { createClient } = await import("@/lib/supabase/client");
    (createClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user-id" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "No workspace found" },
                }),
              })),
            })),
          })),
        })),
      })),
    });

    await act(async () => {
      render(<WelcomePage />);
    });

    // Wait for initial load
    await waitFor(() => {
      expect(mockLoadWorkspaces).toHaveBeenCalled();
    });

    // Navigate to last slide
    const nextButton = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
    });

    // Since there's no workspace, on the last slide the button should be enabled
    // and show "Connect with GitHub"
    await waitFor(() => {
      const connectButton = screen.getByRole("button", {
        name: /connect with github/i,
      });
      expect(connectButton).toBeEnabled();
    });

    // Click the button
    const connectButton = screen.getByRole("button", {
      name: /connect with github/i,
    });
    await act(async () => {
      fireEvent.click(connectButton);
    });

    // Should redirect to workspace creation since no workspace exists
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/onboarding/workspace");
    });
  });

  it("handles GitHub connection errors gracefully", async () => {
    // Mock API error response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: "GitHub App is not configured. Please contact support.",
      }),
    });

    await act(async () => {
      render(<WelcomePage />);
    });

    // Wait for workspace to load
    await waitFor(() => {
      expect(mockLoadWorkspaces).toHaveBeenCalled();
    });

    // Navigate to last slide
    const nextButton = screen.getByRole("button", { name: /next/i });
    await act(async () => {
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
    });

    // Wait for loading to complete and button to be enabled
    await waitFor(() => {
      const button = screen.getByRole("button", {
        name: /connect with github/i,
      });
      expect(button).toBeEnabled();
    });

    // Click Connect with GitHub
    const connectButton = screen.getByRole("button", {
      name: /connect with github/i,
    });
    await act(async () => {
      fireEvent.click(connectButton);
    });

    // Should show connecting state briefly
    expect(screen.getByText("Connecting...")).toBeInTheDocument();

    // Since there's an error and we have a workspace, it should redirect to the workspace issues page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/test-workspace/issues");
    });

    // Verify the error was logged
    expect(console.error).toHaveBeenCalledWith(
      "GitHub install API error:",
      expect.objectContaining({
        error: "GitHub App is not configured. Please contact support.",
      }),
    );
  });
});
