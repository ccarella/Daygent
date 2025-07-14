"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function IssuesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Issues error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issues</h1>
        <p className="text-muted-foreground">
          View and manage your project issues
        </p>
      </div>
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="space-y-2">
            <h3 className="font-semibold">Failed to load issues</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We couldn&apos;t fetch your issues. Check your connection and try
              again.
            </p>
          </div>
          <Button onClick={() => reset()} size="sm">
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
