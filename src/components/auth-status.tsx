"use client";

import { useAuthStore } from "@/stores";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function AuthStatus() {
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } =
    useAuthStore();

  const handleLogin = async () => {
    try {
      await login("demo@example.com", "password");
    } catch (error) {
      console.error("Login failed:", error);
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
    return (
      <div className="p-4">
        <p className="text-red-500 mb-2">Error: {error}</p>
        <Button onClick={clearError} variant="outline" size="sm">
          Clear Error
        </Button>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          {user.avatar && (
            <Image
              src={user.avatar}
              alt={user.name}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-semibold">{user.name}</p>
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
        Login Demo User
      </Button>
    </div>
  );
}
