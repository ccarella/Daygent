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
