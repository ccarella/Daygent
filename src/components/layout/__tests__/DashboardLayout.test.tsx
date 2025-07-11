import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayout } from "../DashboardLayout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/issues",
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

  it("shows sidebar on desktop", () => {
    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
  });

  it("shows mobile nav on mobile", () => {
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    render(
      <DashboardLayout>
        <div>Test</div>
      </DashboardLayout>,
    );

    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
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
