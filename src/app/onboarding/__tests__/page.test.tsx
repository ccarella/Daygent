import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import OnboardingPage from "../page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock the CreateOrganizationForm component
vi.mock("@/components/onboarding/CreateOrganizationForm", () => ({
  CreateOrganizationForm: vi.fn(() => (
    <div data-testid="create-org-form">Create Organization Form</div>
  )),
}));

describe("OnboardingPage", () => {
  it("redirects to login if user is not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as ReturnType<typeof createClient>
    );

    // Mock redirect to throw an error to prevent further execution
    vi.mocked(redirect).mockImplementation((url) => {
      throw new Error(`Redirecting to ${url}`);
    });

    await expect(OnboardingPage()).rejects.toThrow("Redirecting to /login");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to issues if user already has an organization", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ organization_id: "org-123" }],
      }),
    };
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as ReturnType<typeof createClient>
    );

    // Mock redirect to throw an error to prevent further execution
    vi.mocked(redirect).mockImplementation((url) => {
      throw new Error(`Redirecting to ${url}`);
    });

    await expect(OnboardingPage()).rejects.toThrow("Redirecting to /issues");

    expect(mockSupabase.from).toHaveBeenCalledWith("organization_members");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(redirect).toHaveBeenCalledWith("/issues");
  });

  it("renders onboarding form if user has no organization", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    vi.mocked(createClient).mockResolvedValue(
      mockSupabase as ReturnType<typeof createClient>
    );

    // Reset redirect mock to not throw
    vi.mocked(redirect).mockReset();

    // Since this is a server component, we need to extract the JSX it returns
    const result = await OnboardingPage();
    const { container } = render(result as React.ReactElement);

    expect(container.textContent).toContain("Welcome to Daygent");
    expect(container.textContent).toContain("Create Your Organization");
    expect(container.querySelector('[data-testid="create-org-form"]')).toBeTruthy();
  });
});