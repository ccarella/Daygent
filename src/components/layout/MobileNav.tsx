"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  LayoutDashboard,
  FolderGit2,
  Activity,
  Settings,
  User,
  LogOut,
} from "lucide-react";

interface MobileNavProps {
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

export function MobileNav({ pathname }: MobileNavProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const displayName = user?.name || user?.github_username || "User";
  const email = user?.email || "";
  const avatarUrl = user?.avatar_url;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b bg-background px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader className="mb-6">
            <SheetTitle>Daygent</SheetTitle>
          </SheetHeader>

          <div className="mb-6 flex items-center gap-3 rounded-lg border p-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1 truncate">
              <p className="text-sm font-medium">{displayName}</p>
              {email && (
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
              )}
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="ml-2 font-semibold">Daygent</div>
    </div>
  );
}
