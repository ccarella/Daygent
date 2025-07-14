import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "../DashboardLayout";
import { useRouter, usePathname } from "next/navigation";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe("CommandPalette Integration with DashboardLayout", () => {
  const mockPush = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
    (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "/dashboard",
    );

    // Reset store state
    useCommandPaletteStore.setState({
      isOpen: false,
      recentCommands: [],
      customCommands: {},
    });

    // Mock window.innerWidth for responsive behavior
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it("should open command palette with Cmd+K in DashboardLayout", async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Command palette should not be visible initially
    expect(
      screen.queryByPlaceholderText("Type a command or search..."),
    ).not.toBeInTheDocument();

    // Simulate Cmd+K
    await user.keyboard("{Meta>}k{/Meta}");

    // Command palette should now be visible
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a command or search..."),
      ).toBeInTheDocument();
    });
  });

  it("should navigate to different pages from command palette", async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Open command palette
    await user.keyboard("{Meta>}k{/Meta}");

    // Wait for command palette to open and be focused
    await waitFor(() => {
      const input = screen.getByPlaceholderText("Type a command or search...");
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    // Search for issues
    const input = screen.getByPlaceholderText("Type a command or search...");
    await user.clear(input);
    await user.type(input, "issues");

    // Wait for results then select with keyboard
    await waitFor(() => {
      expect(screen.getByText("Go to Issues")).toBeInTheDocument();
    });

    // Press Enter to select the first result
    await user.keyboard("{Enter}");

    // Should navigate to issues and close palette
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/issues");
      expect(
        screen.queryByPlaceholderText("Type a command or search..."),
      ).not.toBeInTheDocument();
    });
  });

  it("should close command palette with ESC", async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Open command palette
    await user.keyboard("{Meta>}k{/Meta}");

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a command or search..."),
      ).toBeInTheDocument();
    });

    // Close with ESC
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Type a command or search..."),
      ).not.toBeInTheDocument();
    });
  });

  it("should maintain command palette functionality across route changes", async () => {
    const { rerender } = render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>,
    );

    // Open command palette on dashboard
    await user.keyboard("{Meta>}k{/Meta}");

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a command or search..."),
      ).toBeInTheDocument();
    });

    // Close it
    await user.keyboard("{Escape}");

    // Simulate route change
    (usePathname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "/issues",
    );
    rerender(
      <DashboardLayout>
        <div>Issues Content</div>
      </DashboardLayout>,
    );

    // Command palette should still work on new route
    await user.keyboard("{Meta>}k{/Meta}");

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a command or search..."),
      ).toBeInTheDocument();
    });
  });

  it("should not interfere with other keyboard shortcuts", async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Try Cmd+B (sidebar toggle)
    await user.keyboard("{Meta>}b{/Meta}");

    // Command palette should not open
    expect(
      screen.queryByPlaceholderText("Type a command or search..."),
    ).not.toBeInTheDocument();
  });

  it("should handle rapid open/close cycles", async () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    // Rapidly toggle command palette
    for (let i = 0; i < 5; i++) {
      await user.keyboard("{Meta>}k{/Meta}");
      await waitFor(() => {
        if (i % 2 === 0) {
          expect(
            screen.getByPlaceholderText("Type a command or search..."),
          ).toBeInTheDocument();
        } else {
          expect(
            screen.queryByPlaceholderText("Type a command or search..."),
          ).not.toBeInTheDocument();
        }
      });
    }
  });
});
