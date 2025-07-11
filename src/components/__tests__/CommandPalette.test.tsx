import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../CommandPalette";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("CommandPalette", () => {
  const mockPush = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });
    // Reset store state
    useCommandPaletteStore.setState({
      isOpen: false,
      recentCommands: [],
      customCommands: {},
    });
  });

  it("should render when open", () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    expect(
      screen.getByPlaceholderText("Type a command or search..."),
    ).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    useCommandPaletteStore.setState({ isOpen: false });
    render(<CommandPalette />);

    expect(
      screen.queryByPlaceholderText("Type a command or search..."),
    ).not.toBeInTheDocument();
  });

  it("should close when ESC is pressed", async () => {
    const closeSpy = vi.spyOn(useCommandPaletteStore.getState(), "close");

    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    await user.keyboard("{Escape}");

    expect(closeSpy).toHaveBeenCalled();
  });

  it("should display all navigation commands", () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Go to Issues")).toBeInTheDocument();
    expect(screen.getByText("Go to Projects")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
  });

  it("should filter commands based on search input", async () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const searchInput = screen.getByPlaceholderText(
      "Type a command or search...",
    );
    await user.type(searchInput, "dashboard");

    await waitFor(() => {
      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Go to Issues")).not.toBeInTheDocument();
      expect(screen.queryByText("Go to Projects")).not.toBeInTheDocument();
      expect(screen.queryByText("Go to Settings")).not.toBeInTheDocument();
    });
  });

  it("should execute command action when selected", async () => {
    const addRecentCommandSpy = vi.spyOn(
      useCommandPaletteStore.getState(),
      "addRecentCommand",
    );
    const closeSpy = vi.spyOn(useCommandPaletteStore.getState(), "close");

    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const dashboardCommand = screen.getByText("Go to Dashboard");
    await user.click(dashboardCommand);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    expect(addRecentCommandSpy).toHaveBeenCalledWith("nav-dashboard");
    expect(closeSpy).toHaveBeenCalled();
  });

  it("should navigate with keyboard and execute with Enter", async () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const searchInput = screen.getByPlaceholderText(
      "Type a command or search...",
    );

    // Type to filter to dashboard command specifically
    await user.type(searchInput, "dashboard");

    // Navigate down to the filtered command
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("should display recent commands when available", () => {
    useCommandPaletteStore.setState({
      isOpen: true,
      recentCommands: ["nav-issues", "nav-settings"],
    });
    render(<CommandPalette />);

    // Check for Recent section
    expect(screen.getByText("Recent")).toBeInTheDocument();

    // Check that recent commands appear first
    const commands = screen.getAllByRole("option");
    expect(commands[0]).toHaveTextContent("Go to Issues");
    expect(commands[1]).toHaveTextContent("Go to Settings");
  });

  it("should display custom command groups", () => {
    const customCommands = {
      "Custom Actions": [
        {
          id: "custom-1",
          title: "Custom Action 1",
          action: vi.fn(),
        },
      ],
    };

    useCommandPaletteStore.setState({
      isOpen: true,
      customCommands,
    });
    render(<CommandPalette />);

    expect(screen.getByText("Custom Actions")).toBeInTheDocument();
    expect(screen.getByText("Custom Action 1")).toBeInTheDocument();
  });

  it("should search by keywords", async () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const searchInput = screen.getByPlaceholderText(
      "Type a command or search...",
    );
    await user.type(searchInput, "tickets");

    await waitFor(() => {
      expect(screen.getByText("Go to Issues")).toBeInTheDocument();
      expect(screen.queryByText("Go to Dashboard")).not.toBeInTheDocument();
    });
  });

  it("should have proper accessibility attributes", () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toHaveAttribute("aria-expanded");
    expect(searchInput).toHaveAttribute("aria-controls");
  });

  it("should show empty state when no results found", async () => {
    useCommandPaletteStore.setState({ isOpen: true });
    render(<CommandPalette />);

    const searchInput = screen.getByPlaceholderText(
      "Type a command or search...",
    );
    await user.type(searchInput, "nonexistentcommand");

    await waitFor(() => {
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });
  });
});
