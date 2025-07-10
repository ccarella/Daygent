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

        // Add timeout to prevent infinite loading - increased to 10 seconds
        const timeoutId = setTimeout(() => {
          const state = useAuthStore.getState();
          if (state.isLoading) {
            console.warn("Auth initialization timed out after 10 seconds");
            set(
              {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error:
                  "Authentication initialization timed out. Please refresh the page or try again.",
              },
              false,
              "initialize/timeout",
            );
          }
        }, 10000);

        try {
          console.log("Starting auth initialization...");

          // First try to get the session
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Error getting session:", sessionError);
            clearTimeout(timeoutId);
            // Don't throw on session error, just treat as no user
            set(
              {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              },
              false,
              "initialize/no-session",
            );
            return;
          }

          // If no session, no need to get user
          if (!session) {
            console.log("No active session found");
            clearTimeout(timeoutId);
            set(
              {
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              },
              false,
              "initialize/no-session",
            );
            return;
          }

          const {
            data: { user: authUser },
            error: getUserError,
          } = await supabase.auth.getUser();

          // Clear timeout immediately after getting response
          clearTimeout(timeoutId);

          if (getUserError) {
            console.error("Error getting user:", getUserError);
            throw getUserError;
          }

          if (authUser) {
            console.log("User found, fetching profile...");
            const { data: profile, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", authUser.id)
              .single();

            if (profileError) {
              console.error("Error fetching user profile:", profileError);
              // Continue with auth user data even if profile fetch fails
            }

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

            console.log("Auth initialization successful");
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
            console.log("No authenticated user found");
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
          console.error("Error initializing auth:", error);
          clearTimeout(timeoutId);
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

    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
      }

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
    } catch (error) {
      console.error("Error in auth state change handler:", error);
      // Still set the user with basic info even if profile fetch fails
      const user: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        github_id: null,
        github_username: null,
      };
      setUser(user);
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  } else {
    setUser(null);
  }
});
