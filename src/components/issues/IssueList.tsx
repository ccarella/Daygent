"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Table component not available, using div-based layout
import { RefreshCw, ExternalLink, Circle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types/workspace";

interface IssueListProps {
  issues: Issue[];
  repositoryId?: string;
  onSync?: () => void;
}

export function IssueList({ issues, repositoryId, onSync }: IssueListProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!repositoryId) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/sync-issues`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_sync: false }),
        }
      );

      if (!response.ok) throw new Error("Sync failed");

      const result = await response.json();
      toast.success(`Synced ${result.synced} issues`);
      
      if (onSync) onSync();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync issues");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {repositoryId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn(
              "mr-2 h-4 w-4",
              isSyncing && "animate-spin"
            )} />
            {isSyncing ? "Syncing..." : "Sync Issues"}
          </Button>
        </div>
      )}

      <div className="border rounded-lg">
        <div className="grid grid-cols-[auto,1fr,200px,200px,150px,50px] gap-4 p-4 border-b font-medium text-sm">
          <div className="w-12">#</div>
          <div>Title</div>
          <div>Repository</div>
          <div>Labels</div>
          <div>Updated</div>
          <div className="w-12"></div>
        </div>
        <div>
          {issues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-[auto,1fr,200px,200px,150px,50px] gap-4 p-4 border-b last:border-0 hover:bg-gray-50">
              <div className="font-mono text-sm">
                {issue.github_issue_number}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  {issue.state === "closed" ? (
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-green-600" />
                  )}
                  <span className={issue.state === "closed" ? "line-through" : ""}>
                    {issue.title}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {issue.repository?.name}
              </div>
              <div>
                <div className="flex flex-wrap gap-1">
                  {issue.labels?.map((label) => (
                    <Badge
                      key={label.name}
                      variant="secondary"
                      style={{
                        backgroundColor: `#${label.color}20`,
                        color: `#${label.color}`,
                        borderColor: `#${label.color}`,
                      }}
                      className="text-xs"
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {issue.github_updated_at && formatDistanceToNow(new Date(issue.github_updated_at), {
                  addSuffix: true,
                })}
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a
                    href={`https://github.com/${issue.repository?.full_name}/issues/${issue.github_issue_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}