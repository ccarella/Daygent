import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "../auth.store";

describe("Auth Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it("should have correct initial state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle successful login", async () => {
    const { result } = renderHook(() => useAuthStore());
    const testEmail = "test@example.com";
    const testPassword = "password123";

    await act(async () => {
      await result.current.login(testEmail, testPassword);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({
      id: "1",
      email: testEmail,
      name: "test",
      avatar: expect.stringContaining("dicebear.com"),
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle logout", async () => {
    const { result } = renderHook(() => useAuthStore());

    // First login
    await act(async () => {
      await result.current.login("test@example.com", "password");
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should update user data", () => {
    const { result } = renderHook(() => useAuthStore());

    // Set initial user
    act(() => {
      result.current.setUser({
        id: "1",
        email: "test@example.com",
        name: "Test User",
      });
    });

    // Update user
    act(() => {
      result.current.updateUser({
        name: "Updated Name",
        avatar: "https://example.com/avatar.jpg",
      });
    });

    expect(result.current.user).toEqual({
      id: "1",
      email: "test@example.com",
      name: "Updated Name",
      avatar: "https://example.com/avatar.jpg",
    });
  });

  it("should clear errors", () => {
    const { result } = renderHook(() => useAuthStore());

    // Set an error using act
    act(() => {
      useAuthStore.setState({ error: "Test error" });
    });

    expect(result.current.error).toBe("Test error");

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should handle loading state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.setLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("should set user and authentication state", () => {
    const { result } = renderHook(() => useAuthStore());
    const testUser = {
      id: "123",
      email: "user@example.com",
      name: "Test User",
    };

    act(() => {
      result.current.setUser(testUser);
    });

    expect(result.current.user).toEqual(testUser);
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
