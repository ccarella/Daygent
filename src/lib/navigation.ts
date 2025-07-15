import {
  ListTodo,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    title: "Issues",
    href: "/issues",
    icon: ListTodo,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;
