import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { CreateProjectModal } from "../create-project-modal";

const mockRepositories = [
  {
    id: "1",
    name: "daygent",
    full_name: "ccarella/daygent",
    description: "AI-powered project management tool",
  },
  {
    id: "2",
    name: "another-repo",
    full_name: "ccarella/another-repo",
    description: "Another test repository",
  },
  {
    id: "3",
    name: "no-description",
    full_name: "ccarella/no-description",
    description: null,
  },
];

const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

global.fetch = vi.fn();

// Mock hasPointerCapture which is not available in jsdom
Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  value: () => false,
});

describe("CreateProjectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ project: { id: "test-project-id" } }),
    });
  });

  it("should render the modal trigger button", () => {
    render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    expect(
      screen.getByRole("button", { name: /new project/i }),
    ).toBeInTheDocument();
  });

  it("should open modal when trigger is clicked", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Create New Project")).toBeInTheDocument();
  });

  it("should display selected repository name in dropdown after selection", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Open the select dropdown
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);

    // Select a repository - use role option to be more specific
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    // Check that the selected value is displayed
    await waitFor(() => {
      expect(selectTrigger).toHaveTextContent("ccarella/daygent");
    });
  });

  it("should auto-populate project name from selected repository", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Initially, the name field should be empty
    const nameInput = screen.getByPlaceholderText("My Awesome Project");
    expect(nameInput).toHaveValue("");

    // Select a repository
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    // Check that the name field is auto-populated
    await waitFor(() => {
      expect(nameInput).toHaveValue("daygent");
    });
  });

  it("should auto-populate description from selected repository", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Initially, the description field should be empty
    const descriptionInput = screen.getByPlaceholderText(
      "Describe your project...",
    );
    expect(descriptionInput).toHaveValue("");

    // Select a repository
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    // Check that the description field is auto-populated
    await waitFor(() => {
      expect(descriptionInput).toHaveValue(
        "AI-powered project management tool",
      );
    });
  });

  it("should not auto-populate description if repository has no description", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    const descriptionInput = screen.getByPlaceholderText(
      "Describe your project...",
    );

    // Select a repository without description
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", {
      name: "ccarella/no-description",
    });
    await user.click(option);

    // Description should remain empty
    await waitFor(() => {
      expect(descriptionInput).toHaveValue("");
    });
  });

  it("should not overwrite user-entered values when selecting repository", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Enter custom values
    const nameInput = screen.getByPlaceholderText("My Awesome Project");
    const descriptionInput = screen.getByPlaceholderText(
      "Describe your project...",
    );

    await user.type(nameInput, "Custom Project Name");
    await user.type(descriptionInput, "Custom description");

    // Select a repository
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    // Custom values should be preserved
    expect(nameInput).toHaveValue("Custom Project Name");
    expect(descriptionInput).toHaveValue("Custom description");
  });

  it("should submit form with correct values", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Select repository and let auto-population happen
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    // Wait for auto-population
    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Project")).toHaveValue(
        "daygent",
      );
    });

    // Submit the form
    await user.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "daygent",
          description: "AI-powered project management tool",
          repository_id: "1",
          workspace_id: "ws-123",
        }),
      });
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/projects/test-project-id");
  });

  it("should display validation errors", async () => {
    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Try to submit without filling required fields
    await user.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText("Repository is required")).toBeInTheDocument();
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("should handle API errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to create project" }),
    });

    const { user } = render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
      />,
    );

    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Fill form
    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const option = screen.getByRole("option", { name: "ccarella/daygent" });
    await user.click(option);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Project")).toHaveValue(
        "daygent",
      );
    });

    // Submit
    await user.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create project")).toBeInTheDocument();
    });
  });

  it("should render with custom trigger", () => {
    render(
      <CreateProjectModal
        repositories={mockRepositories}
        workspaceId="ws-123"
        trigger={<button>Custom Trigger</button>}
      />,
    );

    expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
    expect(screen.queryByText(/new project/i)).not.toBeInTheDocument();
  });
});
