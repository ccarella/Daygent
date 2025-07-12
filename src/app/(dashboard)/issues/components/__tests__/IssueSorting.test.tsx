import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IssueSorting } from "../IssueSorting";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/issues",
  useSearchParams: () => mockSearchParams,
}));

describe("IssueSorting", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("should render sort controls", () => {
    render(<IssueSorting />);

    expect(screen.getByText("Sort by:")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument(); // Default sort
    // Default order is desc, so button shows option to sort ascending
    expect(
      screen.getByRole("button", { name: /sort ascending/i })
    ).toBeInTheDocument();
  });

  it("should update URL when sort field changes", async () => {
    const { user } = render(<IssueSorting />);

    const sortSelect = screen.getByRole("combobox");
    await user.click(sortSelect);
    await user.click(screen.getByText("Created"));

    expect(mockPush).toHaveBeenCalledWith("/issues?sort=created_at&order=desc");
  });

  it("should toggle sort order when button is clicked", async () => {
    const { user } = render(<IssueSorting />);

    // Default order is desc, so button shows "Sort ascending"
    const toggleButton = screen.getByRole("button", {
      name: /sort ascending/i,
    });
    await user.click(toggleButton);

    expect(mockPush).toHaveBeenCalledWith("/issues?order=asc");
  });

  it("should display current sort from URL params", () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("sort", "priority");

    render(<IssueSorting />);

    expect(screen.getByText("Priority")).toBeInTheDocument();
  });

  it("should display ascending order icon when order is asc", () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("order", "asc");

    render(<IssueSorting />);

    // When order is asc, button shows option to sort descending
    expect(
      screen.getByRole("button", { name: /sort descending/i })
    ).toBeInTheDocument();
  });

  it("should reset order to desc when changing sort field", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("sort", "created_at");
    mockSearchParams.set("order", "asc");

    const { user } = render(<IssueSorting />);

    const sortSelect = screen.getByRole("combobox");
    await user.click(sortSelect);
    await user.click(screen.getByText("Priority"));

    expect(mockPush).toHaveBeenCalledWith("/issues?sort=priority&order=desc");
  });

  it("should reset page when sort changes", async () => {
    mockSearchParams = new URLSearchParams();
    mockSearchParams.set("page", "3");

    const { user } = render(<IssueSorting />);

    const sortSelect = screen.getByRole("combobox");
    await user.click(sortSelect);
    await user.click(screen.getByText("Title"));

    // Should not include page parameter
    expect(mockPush).toHaveBeenCalledWith("/issues?sort=title&order=desc");
  });
});