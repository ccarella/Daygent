import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Button } from "./button";

describe("Button", () => {
  it("should render button with text", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("should have data-slot attribute", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button");
  });

  describe("variants", () => {
    it("should render default variant", () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
    });

    it("should render destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-destructive");
      expect(button).toHaveClass("text-white");
    });

    it("should render outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("bg-background");
    });

    it("should render secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-secondary");
      expect(button).toHaveClass("text-secondary-foreground");
    });

    it("should render ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-accent");
    });

    it("should render link variant", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-primary");
      expect(button).toHaveClass("underline-offset-4");
    });
  });

  describe("sizes", () => {
    it("should render default size", () => {
      render(<Button size="default">Default Size</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-9");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2");
    });

    it("should render small size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-8");
      expect(button).toHaveClass("px-3");
    });

    it("should render large size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("px-6");
    });

    it("should render icon size", () => {
      render(<Button size="icon">🚀</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("size-9");
    });
  });

  describe("interactions", () => {
    it("should handle click events", async () => {
      const handleClick = vi.fn();
      const { user } = render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should be disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveClass("disabled:pointer-events-none");
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("should not call onClick when disabled", async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("asChild", () => {
    it("should render as a different element when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/home">Home Link</a>
        </Button>,
      );

      const link = screen.getByRole("link", { name: "Home Link" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/home");
      expect(link).toHaveAttribute("data-slot", "button");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should apply button styles to child element", () => {
      render(
        <Button asChild variant="default" size="lg">
          <a href="/about">About</a>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveClass("bg-primary");
      expect(link).toHaveClass("h-10");
      expect(link).toHaveClass("px-6");
    });
  });

  describe("className prop", () => {
    it("should merge custom className with default classes", () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
      expect(button).toHaveClass("inline-flex");
      expect(button).toHaveClass("items-center");
    });

    it("should override default classes with custom className", () => {
      render(<Button className="bg-custom">Override</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-custom");
    });
  });

  describe("type prop", () => {
    it("should render button element without explicit type", () => {
      render(<Button>Default Type</Button>);
      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it('should accept type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
    });
  });

  describe("forwarded props", () => {
    it("should forward other HTML button props", () => {
      render(
        <Button
          id="test-button"
          data-testid="custom-button"
          aria-label="Custom Button"
        >
          Props Test
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("id", "test-button");
      expect(button).toHaveAttribute("data-testid", "custom-button");
      expect(button).toHaveAttribute("aria-label", "Custom Button");
    });
  });
});
