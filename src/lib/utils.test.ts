import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("px-2 py-1", "text-blue-500");
    expect(result).toBe("px-2 py-1 text-blue-500");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      "base-class",
      isActive && "active",
      isDisabled && "disabled",
    );
    expect(result).toBe("base-class active");
  });

  it("should merge tailwind classes correctly", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle arrays of classes", () => {
    const result = cn(["px-2", "py-1"], ["text-blue-500"]);
    expect(result).toBe("px-2 py-1 text-blue-500");
  });

  it("should handle objects with boolean values", () => {
    const result = cn({
      "px-2": true,
      "py-1": true,
      "text-red-500": false,
      "text-blue-500": true,
    });
    expect(result).toBe("px-2 py-1 text-blue-500");
  });

  it("should handle undefined and null values", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });

  it("should handle empty strings", () => {
    const result = cn("", "px-2", "", "py-1");
    expect(result).toBe("px-2 py-1");
  });

  it("should return empty string when no arguments", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle complex tailwind merging", () => {
    const result = cn(
      "bg-red-500 hover:bg-red-700",
      "bg-blue-500 hover:bg-blue-700",
    );
    expect(result).toBe("bg-blue-500 hover:bg-blue-700");
  });

  it("should preserve non-conflicting classes", () => {
    const result = cn("text-sm font-medium", "bg-blue-500 hover:bg-blue-700");
    expect(result).toBe("text-sm font-medium bg-blue-500 hover:bg-blue-700");
  });
});
