"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function AuthStatus() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    initialize,
  } = useAuthStore();

  const initializeAttempted = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (!initializeAttempted.current) {
      console.log(
        "[AuthStatus Component] Starting auth initialization on mount...",
      );
      initializeAttempted.current = true;
      initialize();
    }
  }, [initialize]);

  const handleLogin = async () => {
    console.log("[AuthStatus Component] Login button clicked");
    try {
      await login();
    } catch (error) {
      console.error("[AuthStatus Component] Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    const isTimeoutError = error.includes("timed out");
    return (
      <div className="p-4 space-y-2">
        <p className="text-red-500">Error: {error}</p>
        <div className="flex gap-2">
          {isTimeoutError && (
            <Button
              onClick={() => {
                clearError();
                initializeAttempted.current = false;
                initialize();
              }}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          )}
          <Button onClick={clearError} variant="outline" size="sm">
            Clear Error
          </Button>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          {user.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.name || user.github_username || "User"}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-semibold">
              {user.name || user.github_username || "User"}
            </p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <Button onClick={handleLogout} variant="outline" size="sm">
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="mb-2">Not logged in</p>
      <Button onClick={handleLogin} size="sm">
        <Github className="mr-2 h-4 w-4" />
        Login with GitHub
      </Button>
    </div>
  );
}
