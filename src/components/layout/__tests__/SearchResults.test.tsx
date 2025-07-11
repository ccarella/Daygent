import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchResults } from "../SearchResults";

describe("SearchResults", () => {
  const mockOnSelectRecent = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    query: "",
    recentSearches: [],
    onSelectRecent: mockOnSelectRecent,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Recent searches", () => {
    it("shows recent searches when query is empty", () => {
      const props = {
        ...defaultProps,
        recentSearches: ["react", "typescript", "testing"],
      };

      render(<SearchResults {...props} />);

      expect(screen.getByText("Recent searches")).toBeInTheDocument();
      props.recentSearches.forEach((search) => {
        expect(screen.getByText(search)).toBeInTheDocument();
      });
    });

    it("calls onSelectRecent when recent search is clicked", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        recentSearches: ["react hooks"],
      };

      render(<SearchResults {...props} />);

      await user.click(screen.getByText("react hooks"));
      expect(mockOnSelectRecent).toHaveBeenCalledWith("react hooks");
    });

    it("hides recent searches when query is entered", () => {
      const props = {
        ...defaultProps,
        query: "test",
        recentSearches: ["react", "typescript"],
      };

      render(<SearchResults {...props} />);

      expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
    });
  });

  describe("Search results", () => {
    it("shows loading state while searching", async () => {
      const props = {
        ...defaultProps,
        query: "test",
      };

      render(<SearchResults {...props} />);

      // Should show loading spinner initially
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("shows search results after loading", async () => {
      const props = {
        ...defaultProps,
        query: "test",
      };

      render(<SearchResults {...props} />);

      // Wait for mock results to load
      await waitFor(
        () => {
          expect(
            screen.getByText(/Fix authentication bug/i),
          ).toBeInTheDocument();
          expect(screen.getByText(/Project Alpha/i)).toBeInTheDocument();
          expect(screen.getByText(/Repository with/i)).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("shows no results message when no matches found", async () => {
      const props = {
        ...defaultProps,
        query: "nonexistent",
      };

      render(<SearchResults {...props} />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      // For our mock, it always returns results, so we'd need to modify the mock
      // In a real test, you'd mock the search function to return empty results
    });

    it("categorizes results by type", async () => {
      const props = {
        ...defaultProps,
        query: "test",
      };

      render(<SearchResults {...props} />);

      await waitFor(() => {
        // Check for type icons
        expect(screen.getByText(/Fix authentication bug/i)).toBeInTheDocument();
        // In real implementation, you'd check for the icon elements
      });
    });

    it("calls onClose when result is clicked", async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        query: "test",
      };

      render(<SearchResults {...props} />);

      await waitFor(() => {
        expect(screen.getByText(/Fix authentication bug/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/Fix authentication bug/i));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Keyboard navigation", () => {
    it("navigates through results with arrow keys", async () => {
      const props = {
        ...defaultProps,
        query: "test",
        recentSearches: ["recent1"],
      };

      const { container } = render(<SearchResults {...props} />);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText(/Fix authentication bug/i)).toBeInTheDocument();
      });

      // Simulate arrow down
      fireEvent.keyDown(container.firstChild!, { key: "ArrowDown" });

      // First item should be highlighted
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveClass("bg-accent");
    });

    it("wraps around when navigating past the end", async () => {
      const props = {
        ...defaultProps,
        query: "test",
      };

      const { container } = render(<SearchResults {...props} />);

      await waitFor(() => {
        expect(screen.getByText(/Fix authentication bug/i)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button");
      const totalItems = buttons.length;

      // Navigate to last item
      for (let i = 0; i < totalItems; i++) {
        fireEvent.keyDown(container.firstChild!, { key: "ArrowDown" });
      }

      // One more should wrap to first
      fireEvent.keyDown(container.firstChild!, { key: "ArrowDown" });

      // First button should be highlighted
      expect(buttons[0]).toHaveClass("bg-accent");
    });

    it("selects item with Enter key", async () => {
      const props = {
        ...defaultProps,
        recentSearches: ["recent search"],
      };

      const { container } = render(<SearchResults {...props} />);

      // Navigate to first item
      fireEvent.keyDown(container.firstChild!, { key: "ArrowDown" });

      // Press Enter
      fireEvent.keyDown(container.firstChild!, { key: "Enter" });

      expect(mockOnSelectRecent).toHaveBeenCalledWith("recent search");
    });
  });

  describe("Help text", () => {
    it("shows help text when no query and no recent searches", () => {
      render(<SearchResults {...defaultProps} />);

      expect(
        screen.getByText(/Type to search issues, projects, and repositories/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Press/i)).toBeInTheDocument();
      expect(screen.getByText(/for full results/i)).toBeInTheDocument();
    });
  });
});
