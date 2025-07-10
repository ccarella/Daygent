"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const router = useRouter();
  const supabase = createClient();

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email",
      },
    });

    if (error) {
      console.error("Error signing in with GitHub:", error);
      throw error;
    }
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
