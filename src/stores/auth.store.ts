import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuthStore, User } from "./types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

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

      login: async () => {
        set({ isLoading: true, error: null }, false, "login/start");

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              scopes: "read:user user:email",
            },
          });

          if (error) {
            throw error;
          }

          // OAuth flow will redirect, so we don't need to set user here
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
          const { error } = await supabase.auth.signOut();

          if (error) {
            throw error;
          }

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

      // Initialize auth state
      initialize: async () => {
        set({ isLoading: true }, false, "initialize/start");

        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (authUser) {
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("id", authUser.id)
              .single();

            const user: User = {
              id: authUser.id,
              email: authUser.email || "",
              name: profile?.name || null,
              avatar_url:
                profile?.avatar_url ||
                authUser.user_metadata?.avatar_url ||
                null,
              github_id: profile?.github_id || null,
              github_username: profile?.github_username || null,
            };

            set(
              {
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              "initialize/success",
            );
          } else {
            set(
              {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              },
              false,
              "initialize/no-user",
            );
          }
        } catch (error) {
          set(
            {
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to initialize auth",
            },
            false,
            "initialize/error",
          );
        }
      },
    }),
    {
      name: "auth-store", // name for devtools
      enabled: process.env.NODE_ENV === "development", // only in dev mode
    },
  ),
);

// Set up auth state listener
supabase.auth.onAuthStateChange(async (_event, session) => {
  const { setUser, setLoading } = useAuthStore.getState();

  if (session?.user) {
    setLoading(true);

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    const user: User = {
      id: session.user.id,
      email: session.user.email || "",
      name: profile?.name || null,
      avatar_url:
        profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
      github_id: profile?.github_id || null,
      github_username: profile?.github_username || null,
    };

    setUser(user);
    setLoading(false);
  } else {
    setUser(null);
  }
});
