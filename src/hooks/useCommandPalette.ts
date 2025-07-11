import { useEffect } from "react";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";

export function useCommandPalette() {
  const {
    isOpen,
    open,
    close,
    toggle,
    registerCommands,
    unregisterCommands,
    addRecentCommand,
  } = useCommandPaletteStore();

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
    registerCommands,
    unregisterCommands,
    addRecentCommand,
  };
}
