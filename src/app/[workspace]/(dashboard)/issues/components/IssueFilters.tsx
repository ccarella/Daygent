"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";


const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ASSIGNEE_OPTIONS = [
  { value: "all", label: "Anyone" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

export function IssueFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to page 1 when filters change
      params.delete("page");

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [searchParams, router, pathname],
  );

  const clearAllFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get("status") && searchParams.get("status") !== "all")
      count++;
    if (searchParams.get("priority") && searchParams.get("priority") !== "all")
      count++;
    if (searchParams.get("assignee") && searchParams.get("assignee") !== "all")
      count++;
    if (searchParams.get("enhanced") === "true") count++;
    return count;
  }, [searchParams]);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1">
          <Label htmlFor="status-filter" className="text-xs">
            Status
          </Label>
          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger id="status-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="priority-filter" className="text-xs">
            Priority
          </Label>
          <Select
            value={searchParams.get("priority") || "all"}
            onValueChange={(value) => updateFilter("priority", value)}
          >
            <SelectTrigger id="priority-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-1">
          <Label htmlFor="assignee-filter" className="text-xs">
            Assignee
          </Label>
          <Select
            value={searchParams.get("assignee") || "all"}
            onValueChange={(value) => updateFilter("assignee", value)}
          >
            <SelectTrigger id="assignee-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNEE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-5">
          <Checkbox
            id="enhanced-filter"
            checked={searchParams.get("enhanced") === "true"}
            onCheckedChange={(checked) =>
              updateFilter("enhanced", checked ? "true" : null)
            }
          />
          <Label
            htmlFor="enhanced-filter"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            AI Enhanced
          </Label>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {activeFilterCount} filter{activeFilterCount !== 1 && "s"} active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
