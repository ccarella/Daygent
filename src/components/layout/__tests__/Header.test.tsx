import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";

// Mock the auth store
const mockLogout = vi.fn().mockResolvedValue(undefined);
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
      github_username: "testuser",
    },
    logout: mockLogout,
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/dashboard",
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
    const logo = screen.getByText("Daygent");
    expect(logo).toBeInTheDocument();
    
    // Check logo link points to /issues
    const logoLink = logo.closest('a');
    expect(logoLink).toHaveAttribute('href', '/issues');

    // Check search (desktop)
    const searchInput = screen.getByPlaceholderText(/Search issues, projects/i);
    expect(searchInput).toBeInTheDocument();

    // Check user avatar button exists
    const avatarButtons = screen.getAllByRole("button");
    expect(avatarButtons.length).toBeGreaterThan(0);
  });

  it("opens user dropdown when avatar is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Click the last button (avatar button)
    const buttons = screen.getAllByRole("button");
    const avatarButton = buttons[buttons.length - 1];
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
    const user = userEvent.setup();
    render(<Header />);

    // Open dropdown - use the last button (avatar)
    const buttons = screen.getAllByRole("button");
    const avatarButton = buttons[buttons.length - 1];
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
