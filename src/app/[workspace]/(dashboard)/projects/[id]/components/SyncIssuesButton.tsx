"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SyncIssuesButtonProps {
  repositoryId: string;
}

export function SyncIssuesButton({ repositoryId }: SyncIssuesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  const handleSync = async () => {
    setIsLoading(true);
    setSyncStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/sync/issues`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            states: ["OPEN", "CLOSED"],
            batchSize: 50,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync issues");
      }

      setSyncStatus("success");

      // Refresh the page after a short delay to show updated issues
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (error) {
      setSyncStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full justify-start"
      variant="outline"
      onClick={handleSync}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing Issues...
        </>
      ) : syncStatus === "success" ? (
        <>
          <Check className="mr-2 h-4 w-4 text-green-600" />
          Issues Synced!
        </>
      ) : syncStatus === "error" ? (
        <>
          <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
          {errorMessage}
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Sync Issues from GitHub
        </>
      )}
    </Button>
  );
}
