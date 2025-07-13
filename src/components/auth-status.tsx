"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function AuthStatus() {
  const {
    user,
    isLoading,
    error,
    login,
    logout,
    checkSession,
  } = useAuthStore();
  
  const isAuthenticated = !!user;
  const initializeAttempted = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (!initializeAttempted.current) {
      console.log(
        "[AuthStatus Component] Starting auth initialization on mount...",
      );
      initializeAttempted.current = true;
      checkSession();
    }
  }, [checkSession]);

  const handleLogin = async () => {
    console.log("[AuthStatus Component] Login button clicked");
    try {
      await login('github');
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
    return (
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-sm text-red-600">Error: {error}</p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              // Clear error by retrying session check
              checkSession();
            }}
            variant="outline"
            size="sm"
          >
            Retry
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Refresh Page
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
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Welcome to our app!</h3>
        <p className="text-sm text-gray-600">Please sign in to continue.</p>
      </div>
      <Button onClick={handleLogin} className="w-full">
        <Github className="mr-2 h-4 w-4" />
        Sign in with GitHub
      </Button>
    </div>
  );
}