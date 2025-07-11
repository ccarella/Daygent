"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderGit2, Activity, Settings } from "lucide-react";

interface SidebarNavProps {
  isOpen: boolean;
  pathname: string;
}

const navItems = [
  {
    title: "Issues",
    href: "/issues",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderGit2,
  },
  {
    title: "Activity",
    href: "/activity",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function SidebarNav({ isOpen, pathname }: SidebarNavProps) {
  return (
    <nav className="space-y-1 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
            )}
            title={!isOpen ? item.title : undefined}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span
              className={cn(
                "transition-opacity duration-200",
                !isOpen && "opacity-0 w-0",
              )}
            >
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
