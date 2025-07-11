"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    console.log("[Login Page] Component mounted");
    const errorParam = searchParams.get("error");
    if (errorParam) {
      console.log("[Login Page] Error param found:", errorParam);
      if (errorParam === "auth_callback_error") {
        setError("Authentication failed. Please try again.");
      } else {
        setError(decodeURIComponent(errorParam));
      }
    }
  }, [searchParams]);

  const handleGitHubLogin = async () => {
    console.log("[Login Page] GitHub login button clicked");
    console.log("[Login Page] Current URL:", window.location.href);

    // Preserve the 'next' parameter through the OAuth flow
    const next = searchParams.get("next") || "/issues";
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);

    console.log("[Login Page] Redirect URL:", callbackUrl.toString());
    console.log("[Login Page] Next destination:", next);

    try {
      setIsLoading(true);
      setError(null);

      const startTime = performance.now();
      console.log("[Login Page] Calling signInWithOAuth...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: callbackUrl.toString(),
          scopes: "repo read:user user:email",
        },
      });

      const elapsed = performance.now() - startTime;
      console.log(
        `[Login Page] signInWithOAuth completed in ${elapsed.toFixed(2)}ms`,
      );

      if (error) {
        console.error("[Login Page] OAuth error:", error);
        console.error("[Login Page] OAuth error details:", {
          message: error.message,
          name: error.name,
          status: (error as { status?: number }).status,
          code: (error as { code?: string }).code,
        });
        setError(error.message);
        setIsLoading(false);
      } else {
        console.log(
          "[Login Page] OAuth initiated successfully, should redirect to GitHub...",
        );
      }
    } catch (err) {
      console.error("[Login Page] Unexpected error:", err);
      console.error("[Login Page] Error type:", err?.constructor?.name);
      console.error("[Login Page] Error stack:", (err as Error)?.stack);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Daygent
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your GitHub account to get started
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          <Github className="mr-2 h-5 w-5" />
          {isLoading ? "Connecting..." : "Continue with GitHub"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By signing in, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
