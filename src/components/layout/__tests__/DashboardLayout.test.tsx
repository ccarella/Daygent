import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayout } from "../DashboardLayout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/issues",
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("../Sidebar", () => ({
  Sidebar: ({
    isOpen,
    onToggle,
  }: {
    isOpen: boolean;
    onToggle: () => void;
  }) => (
    <div data-testid="sidebar" data-open={isOpen}>
      <button onClick={onToggle}>Toggle</button>
    </div>
  ),
}));

vi.mock("../MobileNav", () => ({
  MobileNav: () => <div data-testid="mobile-nav">Mobile Nav</div>,
}));

vi.mock("../Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/CommandPalette", () => ({
  CommandPalette: () => null, // Don't render in these tests
}));

vi.mock("@/hooks/useCommandPalette", () => ({
  useCommandPalette: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    toggle: vi.fn(),
    registerCommands: vi.fn(),
    unregisterCommands: vi.fn(),
    addRecentCommand: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWorkspaceCommands", () => ({
  useWorkspaceCommands: vi.fn(),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders children correctly", () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("shows sidebar and header on desktop", () => {
    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
  });

  it("hides sidebar on mobile", () => {
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    // Header is always visible (handles mobile search)
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("toggles sidebar state", () => {
    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    const sidebar = screen.getByTestId("sidebar");
    const toggleButton = screen.getByText("Toggle");

    expect(sidebar).toHaveAttribute("data-open", "true");

    fireEvent.click(toggleButton);
    expect(sidebar).toHaveAttribute("data-open", "false");
  });

  it("persists sidebar state to localStorage", () => {
    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    const toggleButton = screen.getByText("Toggle");
    fireEvent.click(toggleButton);

    expect(localStorage.getItem("sidebar-open")).toBe("false");
  });

  it("restores sidebar state from localStorage", () => {
    localStorage.setItem("sidebar-open", "false");

    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-open", "false");
  });
});
