"use client";

import { IssueItem } from "./IssueItem";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Issue as WorkspaceIssue } from "@/types/workspace";

type Issue = WorkspaceIssue & {
  repository: { id: string; name: string; full_name: string } | null;
};

interface IssueListProps {
  issues: Issue[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function IssueList({
  issues,
  totalCount,
  currentPage,
  totalPages,
}: IssueListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          {totalCount === 0
            ? "No issues found. Create your first issue to get started."
            : "No issues match your filters. Try adjusting your search criteria."}
        </p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * 25 + 1;
  const endItem = Math.min(currentPage * 25, totalCount);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="divide-y">
          {issues.map((issue) => (
            <IssueItem key={issue.id} issue={issue} />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startItem} to {endItem} of {totalCount} issues
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center gap-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}