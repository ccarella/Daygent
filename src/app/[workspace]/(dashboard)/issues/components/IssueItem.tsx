"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue as WorkspaceIssue } from "@/types/workspace";

type Issue = WorkspaceIssue & {
  repository: { id: string; name: string; full_name: string } | null;
};

interface IssueItemProps {
  issue: Issue;
}

const stateConfig: Record<
  string,
  { label: string; icon: typeof Circle; className: string }
> = {
  open: { label: "Open", icon: Circle, className: "text-blue-600" },
  closed: {
    label: "Closed",
    icon: CheckCircle2,
    className: "text-green-600",
  },
};

export function IssueItem({ issue }: IssueItemProps) {
  const state = stateConfig[issue.state || "open"];
  const StateIcon = state.icon;

  return (
    <div className="px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex items-center">
          <StateIcon className={cn("h-5 w-5", state.className)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/issues/${issue.id}`}
                  className="font-medium hover:underline"
                >
                  <span className="text-muted-foreground">
                    #{issue.github_issue_number || issue.id.slice(0, 8)}
                  </span>{" "}
                  {issue.title}
                </Link>
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {issue.repository && (
                  <span className="text-xs">{issue.repository.name}</span>
                )}
                <span>
                  Updated{" "}
                  {issue.updated_at
                    ? formatDistanceToNow(new Date(issue.updated_at), {
                        addSuffix: true,
                      })
                    : "recently"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <StateIcon className="h-3 w-3 mr-1" />
                {state.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
