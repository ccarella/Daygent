import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarNav } from "../SidebarNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/issues",
}));

describe("SidebarNav", () => {
  it("renders all navigation items", () => {
    render(<SidebarNav isOpen={true} pathname="/issues" />);

    expect(screen.getByText("Issues")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    render(<SidebarNav isOpen={true} pathname="/issues" />);

    const issuesLink = screen.getByRole("link", { name: /issues/i });
    const projectsLink = screen.getByRole("link", { name: /projects/i });

    expect(issuesLink).toHaveClass("bg-accent");
    expect(projectsLink).not.toHaveClass("bg-accent");
  });

  it("hides text when sidebar is collapsed", () => {
    render(<SidebarNav isOpen={false} pathname="/issues" />);

    const issuesText = screen.getByText("Issues");
    expect(issuesText).toHaveClass("opacity-0");
  });

  it("renders correct links", () => {
    render(<SidebarNav isOpen={true} pathname="/issues" />);

    const issuesLink = screen.getByRole("link", { name: /issues/i });
    const projectsLink = screen.getByRole("link", { name: /projects/i });
    const activityLink = screen.getByRole("link", { name: /activity/i });
    const settingsLink = screen.getByRole("link", { name: /settings/i });

    expect(issuesLink).toHaveAttribute("href", "/issues");
    expect(projectsLink).toHaveAttribute("href", "/projects");
    expect(activityLink).toHaveAttribute("href", "/activity");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("adds title attribute when collapsed", () => {
    render(<SidebarNav isOpen={false} pathname="/issues" />);

    const issuesLink = screen.getByRole("link", { name: /issues/i });
    expect(issuesLink).toHaveAttribute("title", "Issues");
  });

  it("removes title attribute when expanded", () => {
    render(<SidebarNav isOpen={true} pathname="/issues" />);

    const issuesLink = screen.getByRole("link", { name: /issues/i });
    expect(issuesLink).not.toHaveAttribute("title");
  });
});
