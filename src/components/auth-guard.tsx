"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLoading } from "@/components/auth-loading";
import type { User } from "@supabase/supabase-js";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  fallback = <AuthLoading />,
  redirectTo = "/login",
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Preserve current path for post-login redirect
          const currentPath = window.location.pathname + window.location.search;
          router.push(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error("[AuthGuard] Error checking auth:", error);
        router.push(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        router.push(redirectTo);
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, redirectTo]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
