import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver (required for cmdk)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView (required for cmdk)
Element.prototype.scrollIntoView = vi.fn();

// Mock pointer capture APIs (required for Radix UI)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}
