import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPalette } from "../useCommandPalette";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";

describe("useCommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useCommandPaletteStore.setState({
      isOpen: false,
      recentCommands: [],
      customCommands: {},
    });
  });

  it("should return command palette state and actions", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current).toHaveProperty("isOpen");
    expect(result.current).toHaveProperty("open");
    expect(result.current).toHaveProperty("close");
    expect(result.current).toHaveProperty("toggle");
    expect(result.current).toHaveProperty("registerCommands");
    expect(result.current).toHaveProperty("unregisterCommands");
    expect(result.current).toHaveProperty("addRecentCommand");
  });

  it("should toggle command palette on Cmd+K (Mac)", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current.isOpen).toBe(false);

    // Simulate Cmd+K
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);

    // Toggle again
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should toggle command palette on Ctrl+K (Windows/Linux)", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current.isOpen).toBe(false);

    // Simulate Ctrl+K
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should prevent default when keyboard shortcut is pressed", () => {
    renderHook(() => useCommandPalette());

    const preventDefaultSpy = vi.fn();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });
    event.preventDefault = preventDefaultSpy;

    act(() => {
      document.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should not toggle on other key combinations", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current.isOpen).toBe(false);

    // Try Cmd+J
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "j",
        metaKey: true,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);

    // Try just K without modifier
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
      });
      document.dispatchEvent(event);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useCommandPalette());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
    );
  });

  it("should allow opening command palette programmatically", () => {
    const { result } = renderHook(() => useCommandPalette());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should allow closing command palette programmatically", () => {
    const { result } = renderHook(() => useCommandPalette());

    // Open first
    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
