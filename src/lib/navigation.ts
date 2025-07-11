import { LayoutDashboard, FolderGit2, Activity, Settings } from "lucide-react";

export const NAV_ITEMS = [
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
] as const;
