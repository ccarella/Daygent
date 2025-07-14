"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Unable to load this page</h2>
          <p className="text-muted-foreground text-sm">
            We encountered an error while loading this content. This might be a
            temporary issue.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()} variant="default" size="sm">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/issues")}
            variant="outline"
            size="sm"
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
