import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserMenu } from "../UserMenu";
import { useAuthStore } from "@/stores/auth.store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("UserMenu", () => {
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

  it("displays user information", () => {
    render(<UserMenu isOpen={true} />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays avatar when available", () => {
    render(<UserMenu isOpen={true} />);

    const avatar = screen.getByAltText("Test User");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("displays github username when name is not available", () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { ...mockUser, name: null },
      logout: mockLogout,
    });

    render(<UserMenu isOpen={true} />);

    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("renders dropdown trigger button", () => {
    render(<UserMenu isOpen={true} />);

    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
  });

  it("hides user info when sidebar is collapsed", () => {
    render(<UserMenu isOpen={false} />);

    const userInfo = screen.getByText("Test User").parentElement;
    expect(userInfo).toHaveClass("opacity-0");
  });
});
