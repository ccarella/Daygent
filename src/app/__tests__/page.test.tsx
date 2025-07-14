import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../page";

describe("LandingPage", () => {
  it("renders the hero section with correct content", () => {
    render(<LandingPage />);

    // Check for Daygent branding
    expect(
      screen.getByRole("heading", { name: "Daygent" }),
    ).toBeInTheDocument();

    // Check for tagline
    expect(
      screen.getByText(
        "Manage Software Engineering Agents in your product development process",
      ),
    ).toBeInTheDocument();
  });

  it("renders Sign In and Sign Up buttons with correct links", () => {
    render(<LandingPage />);

    // Check for Sign In button
    const signInButtons = screen.getAllByRole("link", { name: "Sign In" });
    expect(signInButtons.length).toBeGreaterThan(0);
    expect(signInButtons[0]).toHaveAttribute("href", "/login");

    // Check for Sign Up button
    const signUpButtons = screen.getAllByRole("link", {
      name: /Sign Up|Get Started Free/,
    });
    expect(signUpButtons.length).toBeGreaterThan(0);
    expect(signUpButtons[0]).toHaveAttribute("href", "/signup");
  });

  it("renders all four feature cards", () => {
    render(<LandingPage />);

    // Check for all feature titles
    expect(screen.getByText("AI-Powered Issue Management")).toBeInTheDocument();
    expect(screen.getByText("GitHub Integration")).toBeInTheDocument();
    expect(screen.getByText("Real-time Collaboration")).toBeInTheDocument();
    expect(screen.getByText("Smart Project Tracking")).toBeInTheDocument();
  });

  it("renders the CTA section", () => {
    render(<LandingPage />);

    // Check for CTA heading
    expect(
      screen.getByText("Ready to supercharge your development?"),
    ).toBeInTheDocument();

    // Check for CTA buttons
    expect(
      screen.getByRole("link", { name: "Get Started Free" }),
    ).toHaveAttribute("href", "/signup");
  });

  it("has proper responsive classes on key elements", () => {
    const { container } = render(<LandingPage />);

    // Check hero section has responsive padding
    const heroContainer = container.querySelector(
      ".py-16.sm\\:py-24.lg\\:py-32",
    );
    expect(heroContainer).toBeInTheDocument();

    // Check feature grid has responsive columns
    const featureGrid = container.querySelector(
      ".grid.gap-6.sm\\:grid-cols-2.lg\\:grid-cols-4",
    );
    expect(featureGrid).toBeInTheDocument();
  });
});
