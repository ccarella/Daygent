import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateOrganizationForm } from "../CreateOrganizationForm";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("CreateOrganizationForm", () => {
  const mockPush = vi.fn();
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as ReturnType<typeof createClient>
    );
  });

  it("renders form fields correctly", () => {
    render(<CreateOrganizationForm />);

    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create organization/i })).toBeInTheDocument();
  });

  it("auto-generates slug from organization name", async () => {
    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/organization name/i);
    const slugInput = screen.getByLabelText(/url slug/i);

    await user.type(nameInput, "Test Organization");

    await waitFor(() => {
      expect(slugInput).toHaveValue("test-organization");
    });
  });

  it("validates form fields", async () => {
    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const submitButton = screen.getByRole("button", { name: /create organization/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/organization name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/slug must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it("checks slug availability", async () => {
    // Mock slug is available
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const slugInput = screen.getByLabelText(/url slug/i);
    await user.type(slugInput, "available-slug");

    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("organizations");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("slug", "available-slug");
    });
  });

  it("shows error when slug is taken", async () => {
    // Mock slug is taken
    mockSupabaseClient.maybeSingle.mockResolvedValue({
      data: { id: "existing-org" },
      error: null,
    });

    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/organization name/i);
    const slugInput = screen.getByLabelText(/url slug/i);
    await user.type(nameInput, "Test");
    await user.clear(slugInput);
    await user.type(slugInput, "taken-slug");

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /create organization/i });
      expect(submitButton).toBeDisabled();
    });
  });

  it("creates organization successfully", async () => {
    // Mock slug availability check
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    // Mock successful API response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        organization: {
          id: "new-org-id",
          name: "New Organization",
          slug: "new-organization",
          description: "Test description"
        }
      }),
    } as Response);

    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/organization name/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(nameInput, "New Organization");
    await user.type(descriptionInput, "Test description");

    const submitButton = screen.getByRole("button", { name: /create organization/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "New Organization",
          slug: "new-organization",
          description: "Test description",
        }),
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Organization created!",
        expect.objectContaining({
          description: "Your workspace is ready. Let's connect your first repository.",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/settings/repositories");
    });
  });

  it("handles organization creation error", async () => {
    // Mock slug availability check
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    // Mock error response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "Database error"
      }),
    } as Response);

    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.type(nameInput, "Test Organization");

    const submitButton = screen.getByRole("button", { name: /create organization/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Error creating organization",
        expect.objectContaining({
          description: "Database error",
        })
      );
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("disables form during submission", async () => {
    // Mock slug availability check
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    // Mock slow API response
    vi.mocked(fetch).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ organization: { id: "org-id" } }),
      } as Response), 100))
    );

    render(<CreateOrganizationForm />);
    const user = userEvent.setup();

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.type(nameInput, "Test Organization");

    const submitButton = screen.getByRole("button", { name: /create organization/i });
    await user.click(submitButton);

    // Check that inputs are disabled during submission
    expect(nameInput).toBeDisabled();
    expect(screen.getByLabelText(/url slug/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});