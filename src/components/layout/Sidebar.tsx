"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
}

export function Sidebar({ isOpen, onToggle, pathname }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-200",
        isOpen ? "w-64" : "w-16",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div
            className={cn(
              "font-semibold text-lg transition-opacity duration-200",
              !isOpen && "opacity-0",
            )}
          >
            Daygent
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-8 w-8"
                  aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isOpen ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isOpen ? "Collapse" : "Expand"} (⌘B)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav isOpen={isOpen} pathname={pathname} />
        </div>

        <div className="border-t p-4">
          <UserMenu isOpen={isOpen} />
        </div>
      </div>
    </aside>
  );
}
