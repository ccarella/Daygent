"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";

interface SidebarNavProps {
  isOpen: boolean;
  pathname: string;
}

export function SidebarNav({ isOpen, pathname }: SidebarNavProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return; // Only handle keyboard nav when sidebar is open

      const currentIndex =
        focusedIndex ??
        NAV_ITEMS.findIndex((item) => pathname.startsWith(item.href));

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex =
            currentIndex < NAV_ITEMS.length - 1 ? currentIndex + 1 : 0;
          setFocusedIndex(nextIndex);
          navRefs.current[nextIndex]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : NAV_ITEMS.length - 1;
          setFocusedIndex(prevIndex);
          navRefs.current[prevIndex]?.focus();
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          navRefs.current[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(NAV_ITEMS.length - 1);
          navRefs.current[NAV_ITEMS.length - 1]?.focus();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, isOpen, pathname]);
  return (
    <nav
      className="space-y-1 px-2"
      role="navigation"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              navRefs.current[index] = el;
            }}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
            )}
            title={!isOpen ? item.title : undefined}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            tabIndex={0}
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
