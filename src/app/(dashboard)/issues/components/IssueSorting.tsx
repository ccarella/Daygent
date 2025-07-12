"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
];

export function IssueSorting() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentSort = searchParams.get("sort") || "updated_at";
  const currentOrder = searchParams.get("order") || "desc";

  const updateSort = useCallback(
    (sort: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", sort);
      // Reset to default order when changing sort field
      if (sort !== currentSort) {
        params.set("order", "desc");
      }
      // Reset to page 1 when sorting changes
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname, currentSort]
  );

  const toggleOrder = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", currentOrder === "asc" ? "desc" : "asc");
    // Reset to page 1 when order changes
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname, currentOrder]);

  const getSortLabel = () => {
    const option = SORT_OPTIONS.find((opt) => opt.value === currentSort);
    return option?.label || "Updated";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sort by:</span>
      <Select value={currentSort} onValueChange={updateSort}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>{getSortLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleOrder}
        className="h-10 w-10"
        title={currentOrder === "asc" ? "Sort descending" : "Sort ascending"}
      >
        {currentOrder === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}