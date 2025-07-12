"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  GitBranch,
  Sparkles,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type Issue = Database["public"]["Tables"]["issues"]["Row"] & {
  project: { id: string; name: string } | null;
  repository: { id: string; name: string; full_name: string } | null;
  assigned_user: { id: string; name: string; avatar_url: string | null } | null;
  created_user: { id: string; name: string; avatar_url: string | null } | null;
};

interface IssueItemProps {
  issue: Issue;
}

const statusConfig = {
  open: { label: "Open", icon: Circle, className: "text-blue-600" },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "text-yellow-600",
  },
  review: { label: "In Review", icon: Eye, className: "text-purple-600" },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "text-green-600",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "text-gray-600",
  },
};

const priorityConfig = {
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    className: "text-red-600",
  },
  high: { label: "High", icon: ArrowUp, className: "text-orange-600" },
  medium: { label: "Medium", icon: ArrowRight, className: "text-yellow-600" },
  low: { label: "Low", icon: ArrowDown, className: "text-blue-600" },
};

export function IssueItem({ issue }: IssueItemProps) {
  const status = statusConfig[issue.status];
  const priority = priorityConfig[issue.priority];
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="px-4 py-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2">
          <StatusIcon className={cn("h-5 w-5", status.className)} />
          <div title={priority.label}>
            <PriorityIcon
              className={cn("h-4 w-4", priority.className)}
            />
          </div>
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
                {issue.expanded_description && (
                  <div title="AI Enhanced">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                {issue.github_pr_number && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    PR #{issue.github_pr_number}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {issue.project && (
                  <span className="font-medium">{issue.project.name}</span>
                )}
                {issue.repository && (
                  <span className="text-xs">{issue.repository.name}</span>
                )}
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(issue.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {status.label}
              </Badge>
              {issue.assigned_user && (
                <Avatar className="h-6 w-6" data-testid={`avatar-${issue.assigned_user.name}`}>
                  <AvatarImage
                    src={issue.assigned_user.avatar_url || undefined}
                    alt={issue.assigned_user.name}
                  />
                  <AvatarFallback className="text-xs">
                    {getUserInitials(issue.assigned_user.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}