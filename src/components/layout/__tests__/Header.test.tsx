import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";

// Mock the auth store
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      github_username: "testuser",
    },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the header with all elements", () => {
    render(<Header />);

    // Check logo
    expect(screen.getByText("Daygent")).toBeInTheDocument();

    // Check search (desktop)
    const searchInput = screen.getByPlaceholderText(/Search issues, projects/i);
    expect(searchInput).toBeInTheDocument();

    // Check user avatar
    const avatar = screen.getByRole("img", { name: "Test User" });
    expect(avatar).toBeInTheDocument();
  });

  it("opens user dropdown when avatar is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Click avatar
    const avatarButton = screen.getByRole("button", { name: /Test User/i });
    await user.click(avatarButton);

    // Check dropdown content
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });
  });

  it("calls logout when sign out is clicked", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockPush = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
        github_username: "testuser",
      },
      logout: mockLogout,
    } as ReturnType<typeof useAuthStore>);

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);

    const user = userEvent.setup();
    render(<Header />);

    // Open dropdown
    const avatarButton = screen.getByRole("button", { name: /Test User/i });
    await user.click(avatarButton);

    // Click sign out
    const signOutButton = screen.getByText("Sign out");
    await user.click(signOutButton);

    expect(mockLogout).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("has sticky positioning", () => {
    const { container } = render(<Header />);
    const header = container.querySelector("header");

    expect(header).toHaveClass("sticky", "top-0", "z-50");
  });
});
