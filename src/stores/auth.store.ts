import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuthStore } from "./types";

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) =>
        set(
          () => ({
            user,
            isAuthenticated: !!user,
            error: null,
          }),
          false,
          "setUser",
        ),

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      login: async (email, _password) => {
        set({ isLoading: true, error: null }, false, "login/start");

        try {
          // TODO: Replace with actual Supabase auth when configured
          // Simulating async login for now
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Mock successful login
          const mockUser = {
            id: "1",
            email,
            name: email.split("@")[0],
            avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${email}`,
          };

          set(
            {
              user: mockUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            },
            false,
            "login/success",
          );
        } catch (error) {
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: error instanceof Error ? error.message : "Login failed",
            },
            false,
            "login/error",
          );
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true }, false, "logout/start");

        try {
          // TODO: Replace with actual Supabase signOut when configured
          await new Promise((resolve) => setTimeout(resolve, 500));

          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            },
            false,
            "logout/success",
          );
        } catch (error) {
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : "Logout failed",
            },
            false,
            "logout/error",
          );
          throw error;
        }
      },

      updateUser: (updates) =>
        set(
          (state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          }),
          false,
          "updateUser",
        ),

      clearError: () => set({ error: null }, false, "clearError"),

      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
    }),
    {
      name: "auth-store", // name for devtools
      enabled: process.env.NODE_ENV === "development", // only in dev mode
    },
  ),
);
