import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearch } from "../GlobalSearch";

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Desktop mode", () => {
    it("renders search input with placeholder", () => {
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(
        /Search issues, projects.*Cmd\+K/i,
      );
      expect(input).toBeInTheDocument();
    });

    it("focuses input when Cmd+K is pressed", async () => {
      render(<GlobalSearch />);
      const input = screen.getByPlaceholderText(/Search issues, projects/i);

      // Simulate Cmd+K
      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });

    it("focuses input when Ctrl+K is pressed (Windows/Linux)", async () => {
      render(<GlobalSearch />);
      const input = screen.getByPlaceholderText(/Search issues, projects/i);

      // Simulate Ctrl+K
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });
    });

    it("shows search results when typing", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.click(input);
      await user.type(input, "test query");

      // Wait for debounce and results
      await waitFor(
        () => {
          expect(
            screen.getByText(/Fix authentication bug/i),
          ).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("shows clear button when query is entered", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /Clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it("clears search when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(
        /Search issues, projects/i,
      ) as HTMLInputElement;
      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /Clear search/i });
      await user.click(clearButton);

      expect(input.value).toBe("");
    });

    it("hides results when clicking outside", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <GlobalSearch />
          <div>Outside element</div>
        </div>,
      );

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.click(input);

      // Should show help text initially
      expect(screen.getByText(/Type to search/i)).toBeInTheDocument();

      // Click outside
      await user.click(screen.getByText("Outside element"));

      // Results should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/Type to search/i)).not.toBeInTheDocument();
      });
    });

    it("closes results when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.click(input);

      // Should show help text
      expect(screen.getByText(/Type to search/i)).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      // Results should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/Type to search/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Mobile mode", () => {
    it("renders search button instead of input", () => {
      render(<GlobalSearch isMobile />);

      const button = screen.getByRole("button", { name: /Search/i });
      expect(button).toBeInTheDocument();

      // Should not show input
      expect(
        screen.queryByPlaceholderText(/Search issues, projects/i),
      ).not.toBeInTheDocument();
    });

    it("opens dialog when button is clicked", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch isMobile />);

      const button = screen.getByRole("button", { name: /Search/i });
      await user.click(button);

      // Dialog should open with input
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText(/Search issues, projects/i),
        ).toBeInTheDocument();
      });
    });

    it("opens dialog when Cmd+K is pressed", async () => {
      render(<GlobalSearch isMobile />);

      // Simulate Cmd+K
      fireEvent.keyDown(window, { key: "k", metaKey: true });

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

  describe("Recent searches", () => {
    it("loads recent searches from localStorage", () => {
      const recentSearches = ["react hooks", "typescript", "testing"];
      localStorage.setItem("recentSearches", JSON.stringify(recentSearches));

      render(<GlobalSearch />);
      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      fireEvent.focus(input);

      expect(screen.getByText("Recent searches")).toBeInTheDocument();
      recentSearches.forEach((search) => {
        expect(screen.getByText(search)).toBeInTheDocument();
      });
    });

    it("saves search to recent searches on form submit", async () => {
      const user = userEvent.setup();
      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.type(input, "new search{Enter}");

      const saved = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      expect(saved).toContain("new search");
    });

    it("limits recent searches to 5 items", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "recentSearches",
        JSON.stringify(["1", "2", "3", "4", "5"]),
      );

      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.type(input, "new search{Enter}");

      const saved = JSON.parse(
        localStorage.getItem("recentSearches") || "[]",
      ) as string[];
      expect(saved).toHaveLength(5);
      expect(saved[0]).toBe("new search");
      expect(saved).not.toContain("5"); // Oldest should be removed
    });

    it("deduplicates recent searches", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "recentSearches",
        JSON.stringify(["existing", "other"]),
      );

      render(<GlobalSearch />);

      const input = screen.getByPlaceholderText(/Search issues, projects/i);
      await user.type(input, "existing{Enter}");

      const saved = JSON.parse(
        localStorage.getItem("recentSearches") || "[]",
      ) as string[];
      expect(saved).toHaveLength(2);
      expect(saved[0]).toBe("existing"); // Should be moved to top
      expect(saved.filter((s: string) => s === "existing")).toHaveLength(1); // No duplicates
    });
  });
});
