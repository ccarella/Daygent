"use client";

import Link from "next/link";
import { GlobalSearch } from "./GlobalSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuthStore } from "@/stores/auth.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { LogOut, Settings, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  // Build breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [];

  if (currentWorkspace && segments[0] === currentWorkspace.slug) {
    breadcrumbs.push({
      name: currentWorkspace.name,
      href: `/${currentWorkspace.slug}`,
    });

    if (segments[1]) {
      breadcrumbs.push({
        name: segments[1].charAt(0).toUpperCase() + segments[1].slice(1),
        href: `/${segments[0]}/${segments[1]}`,
      });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Workspace */}
        <div className="flex items-center gap-4">
          <Link href="/issues" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">Daygent</span>
          </Link>
          
          {/* Workspace Switcher and Breadcrumbs */}
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher />
            
            {breadcrumbs.length > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <BreadcrumbItem key={crumb.href}>
                        {index < breadcrumbs.length - 1 ? (
                          <>
                            <BreadcrumbLink href={crumb.href}>
                              {crumb.name}
                            </BreadcrumbLink>
                            <BreadcrumbSeparator />
                          </>
                        ) : (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
          </div>
        </div>

        {/* Search - centered on desktop */}
        <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-4">
          <GlobalSearch />
        </div>

        {/* User Avatar and Menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile search button */}
          <div className="md:hidden">
            <GlobalSearch isMobile />
          </div>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.avatar_url || undefined}
                    alt={user?.name || "User"}
                  />
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
