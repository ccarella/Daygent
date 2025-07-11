import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MobileNav } from "../MobileNav";
import { useAuthStore } from "@/stores/auth.store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("MobileNav", () => {
  const mockLogout = vi.fn();
  const mockUser = {
    id: "123",
    email: "test@example.com",
    name: "Test User",
    avatar_url: "https://example.com/avatar.jpg",
    github_id: 12345,
    github_username: "testuser",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  it("renders mobile nav header", () => {
    render(<MobileNav pathname="/issues" />);

    expect(screen.getByText("Daygent")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /toggle navigation/i }),
    ).toBeInTheDocument();
  });

  it("opens sheet when menu button is clicked", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("displays all navigation items in sheet", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /issues/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /projects/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /activity/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /settings/i }),
      ).toBeInTheDocument();
    });
  });

  it("highlights active navigation item", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      const issuesLink = screen.getByRole("link", { name: /issues/i });
      const projectsLink = screen.getByRole("link", { name: /projects/i });

      expect(issuesLink).toHaveClass("bg-accent");
      expect(projectsLink).not.toHaveClass("bg-accent");
    });
  });

  it("closes sheet when navigation item is clicked", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      const projectsLink = screen.getByRole("link", { name: /projects/i });
      fireEvent.click(projectsLink);
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: /projects/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("calls logout when sign out is clicked", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutButton);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  it("displays user avatar when available", async () => {
    render(<MobileNav pathname="/issues" />);

    const menuButton = screen.getByRole("button", {
      name: /toggle navigation/i,
    });
    fireEvent.click(menuButton);

    await waitFor(() => {
      const avatar = screen.getByAltText("Test User");
      expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    });
  });
});
