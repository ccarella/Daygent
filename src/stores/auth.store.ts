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
      activeOrganization: null,
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

      setActiveOrganization: (org) => {
        set({ activeOrganization: org }, false, "setActiveOrganization");
        // Store in localStorage for persistence
        if (org) {
          localStorage.setItem("activeOrganizationId", org.id);
        } else {
          localStorage.removeItem("activeOrganizationId");
        }
      },

      login: async () => {
        console.log("[Auth Store] Starting GitHub OAuth login...");
        console.log("[Auth Store] Login timestamp:", new Date().toISOString());
        console.log("[Auth Store] Current origin:", window.location.origin);
        console.log(
          "[Auth Store] Redirect URL:",
          `${window.location.origin}/auth/callback`,
        );

        set({ isLoading: true, error: null }, false, "login/start");

        try {
          const loginStartTime = performance.now();
          console.log("[Auth Store] Calling supabase.auth.signInWithOAuth...");

          const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              scopes: "repo read:user user:email",
            },
          });

          const loginTime = performance.now() - loginStartTime;
          console.log(
            `[Auth Store] signInWithOAuth completed in ${loginTime.toFixed(2)}ms`,
          );

          if (error) {
            console.error("[Auth Store] OAuth sign-in error:", error);
            console.error("[Auth Store] OAuth error details:", {
              message: error.message,
              name: error.name,
              status: (error as { status?: number }).status,
              code: (error as { code?: string }).code,
            });
            throw error;
          }

          console.log(
            "[Auth Store] OAuth sign-in initiated successfully, redirecting to GitHub...",
          );
          // OAuth flow will redirect, so we don't need to set user here
        } catch (error) {
          console.error("[Auth Store] Login failed:", error);
          console.error("[Auth Store] Error type:", error?.constructor?.name);
          console.error("[Auth Store] Error stack:", (error as Error)?.stack);

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

          // Clear organization data
          localStorage.removeItem("activeOrganizationId");

          set(
            {
              user: null,
              activeOrganization: null,
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
        const startTime = performance.now();
        console.log("[Auth Store] Starting auth initialization...");
        console.log(
          "[Auth Store] Initialization timestamp:",
          new Date().toISOString(),
        );

        set({ isLoading: true }, false, "initialize/start");

        // Add timeout to prevent infinite loading - increased to 10 seconds
        const timeoutId = setTimeout(() => {
          const state = useAuthStore.getState();
          if (state.isLoading) {
            const timeElapsed = performance.now() - startTime;
            console.error(
              `[Auth Store] Auth initialization timed out after ${timeElapsed.toFixed(2)}ms (10 second limit)`,
            );
            console.error(
              "[Auth Store] Timeout occurred at:",
              new Date().toISOString(),
            );
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
          // Log Supabase client status
          console.log("[Auth Store] Supabase client created:", !!supabase);
          console.log(
            "[Auth Store] Supabase URL:",
            process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
          );
          console.log(
            "[Auth Store] Supabase Anon Key:",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing",
          );

          // First try to get the session
          console.log("[Auth Store] Attempting to get session...");
          const sessionStartTime = performance.now();

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          const sessionTime = performance.now() - sessionStartTime;
          console.log(
            `[Auth Store] getSession completed in ${sessionTime.toFixed(2)}ms`,
          );

          if (sessionError) {
            console.error("[Auth Store] Error getting session:", sessionError);
            console.error("[Auth Store] Session error details:", {
              message: sessionError.message,
              name: sessionError.name,
              status: (sessionError as { status?: number }).status,
              code: (sessionError as { code?: string }).code,
            });
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
            console.log("[Auth Store] No active session found");
            console.log(
              `[Auth Store] Total initialization time: ${(performance.now() - startTime).toFixed(2)}ms`,
            );
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

          console.log("[Auth Store] Session found, getting user details...");
          console.log(
            "[Auth Store] Session expires at:",
            session.expires_at
              ? new Date(session.expires_at * 1000).toISOString()
              : "N/A",
          );

          const getUserStartTime = performance.now();
          const {
            data: { user: authUser },
            error: getUserError,
          } = await supabase.auth.getUser();

          const getUserTime = performance.now() - getUserStartTime;
          console.log(
            `[Auth Store] getUser completed in ${getUserTime.toFixed(2)}ms`,
          );

          // Clear timeout immediately after getting response
          clearTimeout(timeoutId);

          if (getUserError) {
            console.error("[Auth Store] Error getting user:", getUserError);
            console.error("[Auth Store] User error details:", {
              message: getUserError.message,
              name: getUserError.name,
              status: (getUserError as { status?: number }).status,
              code: (getUserError as { code?: string }).code,
            });
            throw getUserError;
          }

          if (authUser) {
            console.log("[Auth Store] User found:", authUser.id);
            console.log("[Auth Store] User email:", authUser.email);
            console.log(
              "[Auth Store] User metadata keys:",
              Object.keys(authUser.user_metadata || {}),
            );

            let profile = null;
            let profileError = null;

            // Skip profile query if bypassed
            if (BYPASS_PROFILE_QUERIES) {
              console.log(
                "[Auth Store] Profile query bypassed - using auth metadata",
              );
              profileError = {
                message: "Profile query bypassed",
                code: "BYPASSED",
                details: "Using auth metadata instead",
              };
            } else {
              console.log(
                "[Auth Store] Fetching user profile from database...",
              );
              const profileStartTime = performance.now();

              let timedOut = false;

              // Create a timeout that will definitely fire
              const timeoutId = setTimeout(() => {
                timedOut = true;
                console.log(
                  "[Auth Store] Profile query timeout triggered after 3 seconds",
                );
              }, 3000);

              try {
                // Try to fetch the profile
                const result = await supabase
                  .from("users")
                  .select("*")
                  .eq("id", authUser.id)
                  .maybeSingle();

                clearTimeout(timeoutId);

                if (!timedOut) {
                  profile = result.data;
                  profileError = result.error;
                } else {
                  profileError = {
                    message: "Profile query timed out after 3 seconds",
                    code: "TIMEOUT",
                    details:
                      "The profile query did not complete within the timeout period",
                  };
                }
              } catch (e) {
                clearTimeout(timeoutId);
                console.error("[Auth Store] Profile query threw an error:", e);
                profileError = {
                  message:
                    e instanceof Error ? e.message : "Unknown error occurred",
                  code: "QUERY_ERROR",
                  details: e,
                };
              }

              const profileTime = performance.now() - profileStartTime;
              console.log(
                `[Auth Store] Profile fetch completed in ${profileTime.toFixed(2)}ms`,
              );
            }

            if (profileError) {
              console.error(
                "[Auth Store] Error fetching user profile:",
                profileError,
              );
              console.error("[Auth Store] Profile error details:", {
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint,
              });
              // Continue with auth user data even if profile fetch fails
            } else {
              console.log("[Auth Store] Profile fetched successfully");
              console.log("[Auth Store] Profile data:", {
                github_id: profile?.github_id ? "Set" : "Not set",
                github_username: profile?.github_username || "Not set",
                name: profile?.name ? "Set" : "Not set",
                avatar_url: profile?.avatar_url ? "Set" : "Not set",
              });
            }

            const user: User = {
              id: authUser.id,
              email: authUser.email || "",
              name:
                profile?.name ||
                authUser.user_metadata?.name ||
                authUser.user_metadata?.full_name ||
                null,
              avatar_url:
                profile?.avatar_url ||
                authUser.user_metadata?.avatar_url ||
                null,
              github_id:
                profile?.github_id ||
                (authUser.app_metadata?.provider === "github"
                  ? authUser.user_metadata?.provider_id
                  : null),
              github_username:
                profile?.github_username ||
                authUser.user_metadata?.user_name ||
                null,
            };

            const totalTime = performance.now() - startTime;
            console.log(
              `[Auth Store] Auth initialization successful in ${totalTime.toFixed(2)}ms`,
            );
            console.log("[Auth Store] Final user data:", {
              id: user.id,
              email: user.email,
              github_username: user.github_username || "Not set",
            });

            // Fetch user's default organization
            let activeOrg = null;
            try {
              console.log(
                "[Auth Store] Fetching user's default organization...",
              );
              const { data: orgData, error: orgError } = await supabase.rpc(
                "get_user_default_organization",
                { user_id: user.id },
              );

              if (orgError) {
                console.error(
                  "[Auth Store] Error fetching organization:",
                  orgError,
                );
              } else if (orgData && orgData.length > 0) {
                activeOrg = orgData[0];
                console.log(
                  "[Auth Store] Default organization found:",
                  activeOrg.slug,
                );
                localStorage.setItem("activeOrganizationId", activeOrg.id);
              } else {
                console.log("[Auth Store] No organization found for user");
              }
            } catch (orgError) {
              console.error(
                "[Auth Store] Error in organization fetch:",
                orgError,
              );
            }

            set(
              {
                user,
                activeOrganization: activeOrg,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              },
              false,
              "initialize/success",
            );
          } else {
            console.log(
              "[Auth Store] No authenticated user found after getUser",
            );
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
          const totalTime = performance.now() - startTime;
          console.error(
            `[Auth Store] Error initializing auth after ${totalTime.toFixed(2)}ms:`,
            error,
          );
          console.error("[Auth Store] Error type:", error?.constructor?.name);
          console.error("[Auth Store] Error stack:", (error as Error)?.stack);

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

// Flag to track if profile queries are failing
let profileQueryFailing = false;

// Emergency bypass - set to true to skip all profile queries
const BYPASS_PROFILE_QUERIES = true; // TODO: Remove this once RLS issues are resolved

// Set up auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("[Auth Store] Auth state changed:", event);
  console.log("[Auth Store] Session present:", !!session);
  console.log("[Auth Store] Event timestamp:", new Date().toISOString());

  const { setUser, setLoading } = useAuthStore.getState();

  if (session?.user) {
    console.log(
      "[Auth Store] User detected in auth state change:",
      session.user.id,
    );
    console.log("[Auth Store] User email:", session.user.email);
    setLoading(true);

    try {
      let profile = null;
      let error = null;
      const profileStartTime = performance.now();

      // Wrap entire profile fetch in try-catch to ensure we always proceed
      try {
        // Skip profile query if bypassed or failing
        if (BYPASS_PROFILE_QUERIES || profileQueryFailing) {
          console.log(
            "[Auth Store] Skipping profile query due to previous failures",
          );
          error = {
            message: "Profile query skipped due to previous failures",
            code: "SKIPPED",
            details: "Using auth metadata instead",
          };
        } else {
          console.log("[Auth Store] Fetching user profile for state change...");

          let timedOut = false;

          // Create a timeout that will definitely fire
          const timeoutId = setTimeout(() => {
            timedOut = true;
            profileQueryFailing = true;
            console.log(
              "[Auth Store] Profile query timeout triggered after 2 seconds",
            );
          }, 2000);

          try {
            // Try to fetch the profile
            const result = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            clearTimeout(timeoutId);

            if (!timedOut) {
              profile = result.data;
              error = result.error;
              profileQueryFailing = false; // Reset flag on success
            } else {
              error = {
                message: "Profile query timed out after 2 seconds",
                code: "TIMEOUT",
                details:
                  "The profile query did not complete within the timeout period",
              };
            }
          } catch (e) {
            clearTimeout(timeoutId);
            profileQueryFailing = true;
            console.error("[Auth Store] Profile query threw an error:", e);
            error = {
              message:
                e instanceof Error ? e.message : "Unknown error occurred",
              code: "QUERY_ERROR",
              details: e,
            };
          }
        }
      } catch (criticalError) {
        console.error(
          "[Auth Store] Critical error in profile fetch:",
          criticalError,
        );
        error = {
          message: "Critical error occurred",
          code: "CRITICAL_ERROR",
          details: criticalError,
        };
      }

      const profileTime = performance.now() - profileStartTime;
      console.log(
        `[Auth Store] State change profile fetch completed in ${profileTime.toFixed(2)}ms`,
      );

      if (error) {
        console.error(
          "[Auth Store] Error fetching user profile in state change:",
          error,
        );
        console.error("[Auth Store] Profile error details:", {
          message: error?.message || "Unknown error",
          code: error?.code || "UNKNOWN",
          details: error?.details || error,
          hint: error?.hint,
        });
      } else {
        console.log(
          "[Auth Store] Profile fetched successfully in state change",
        );
      }

      const user: User = {
        id: session.user.id,
        email: session.user.email || "",
        name:
          profile?.name ||
          session.user.user_metadata?.name ||
          session.user.user_metadata?.full_name ||
          null,
        avatar_url:
          profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
        github_id:
          profile?.github_id ||
          (session.user.app_metadata?.provider === "github"
            ? session.user.user_metadata?.provider_id
            : null),
        github_username:
          profile?.github_username ||
          session.user.user_metadata?.user_name ||
          null,
      };

      console.log("[Auth Store] Setting user from state change:", {
        id: user.id,
        email: user.email,
        github_username: user.github_username || "Not set",
      });

      setUser(user);
    } catch (error) {
      console.error("[Auth Store] Error in auth state change handler:", error);
      console.error("[Auth Store] Error type:", error?.constructor?.name);
      // Still set the user with basic info even if profile fetch fails
      const user: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        github_id: null,
        github_username: null,
      };
      console.log("[Auth Store] Setting user with basic info after error");
      setUser(user);
    } finally {
      // Always clear loading state
      console.log("[Auth Store] Clearing loading state in auth state change");
      setLoading(false);
    }
  } else {
    console.log("[Auth Store] No user in session, clearing user state");
    setUser(null);
  }
});
