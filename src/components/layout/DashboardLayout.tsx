"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useWorkspaceCommands } from "@/hooks/useWorkspaceCommands";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  useCommandPalette(); // Initialize global keyboard shortcuts
  useWorkspaceCommands(); // Register workspace switching commands

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-open");
    if (savedState !== null) {
      setSidebarOpen(JSON.parse(savedState));
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />

      {/* Header - always visible */}
      <Header />

      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          pathname={pathname}
        />
      )}

      {/* Mobile navigation - now handled in Header */}
      {/* {isMobile && <MobileNav pathname={pathname} />} */}

      <main
        className={cn(
          "transition-all duration-200 ease-in-out",
          "pt-16", // Account for fixed header
          !isMobile && sidebarOpen && "md:ml-64",
          !isMobile && !sidebarOpen && "md:ml-16",
        )}
      >
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
