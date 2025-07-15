"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface SyncStatusData {
  sync_in_progress: boolean;
  last_issue_sync: string | null;
  last_issue_cursor: string | null;
}

interface SyncStatusProps {
  repositoryId: string;
}

export function SyncStatus({ repositoryId }: SyncStatusProps) {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/repositories/${repositoryId}/sync-status`,
        );
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch sync status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [repositoryId]);

  if (isLoading) return null;
  if (!status) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {status.sync_in_progress ? (
            <>
              <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
              <div>
                <p className="font-medium">Syncing issues...</p>
                <p className="text-sm text-gray-600">
                  This may take a few minutes
                </p>
              </div>
            </>
          ) : status.last_issue_sync ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Issues synced</p>
                <p className="text-sm text-gray-600">
                  Last synced{" "}
                  {formatDistanceToNow(new Date(status.last_issue_sync), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">Not synced</p>
                <p className="text-sm text-gray-600">
                  Click sync to import issues
                </p>
              </div>
            </>
          )}
        </div>

        {status.sync_in_progress && (
          <Badge variant="secondary">In Progress</Badge>
        )}
      </div>
    </Card>
  );
}
