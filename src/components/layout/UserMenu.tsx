"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Keyboard, Github } from "lucide-react";

interface UserMenuProps {
  isOpen: boolean;
}

export function UserMenu({ isOpen }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const displayName = user?.name || user?.github_username || "User";
  const email = user?.email || "";
  const avatarUrl = user?.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3",
            !isOpen && "justify-center",
          )}
        >
          {avatarUrl && !imageError ? (
            <>
              {imageLoading && (
                <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName}
                className={cn("h-6 w-6 rounded-full", imageLoading && "hidden")}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            </>
          ) : (
            <User className="h-4 w-4" />
          )}
          <div
            className={cn(
              "flex flex-col items-start text-left transition-opacity duration-200",
              !isOpen && "opacity-0 w-0",
            )}
          >
            <span className="text-sm font-medium">{displayName}</span>
            {email && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {email}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/settings/profile")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings/shortcuts")}
          className="cursor-pointer"
        >
          <Keyboard className="mr-2 h-4 w-4" />
          Keyboard Shortcuts
          <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user?.github_username && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            <Github className="mr-2 h-3 w-3" />
            Signed in via GitHub
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
