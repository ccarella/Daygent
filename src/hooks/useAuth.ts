"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();

  const signInWithGitHub = async () => {
    console.log("[useAuth Hook] Starting GitHub OAuth sign-in...");
    console.log(
      "[useAuth Hook] Redirect URL:",
      `${window.location.origin}/auth/callback`,
    );

    const startTime = performance.now();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "repo read:user user:email",
      },
    });

    const elapsed = performance.now() - startTime;
    console.log(
      `[useAuth Hook] OAuth sign-in call completed in ${elapsed.toFixed(2)}ms`,
    );

    if (error) {
      console.error("[useAuth Hook] Error signing in with GitHub:", error);
      console.error("[useAuth Hook] Error details:", {
        message: error.message,
        name: error.name,
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
      });
      throw error;
    }

    console.log(
      "[useAuth Hook] OAuth sign-in successful, redirecting to GitHub...",
    );
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }
    router.push("/login");
    router.refresh();
  };

  const getSession = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
      throw error;
    }
    return session;
  };

  const refreshSession = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Error refreshing session:", error);
      throw error;
    }
    return session;
  };

  return {
    signInWithGitHub,
    signOut,
    getSession,
    refreshSession,
  };
}
