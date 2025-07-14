import {
  ListTodo,
  GitBranch,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    title: "Issues",
    href: "/issues",
    icon: ListTodo,
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: GitBranch,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;
