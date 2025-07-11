import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Command } from "@/components/CommandPalette";

interface CommandPaletteState {
  isOpen: boolean;
  recentCommands: string[]; // Store command IDs
  customCommands: Record<string, Command[]>; // Commands registered by other features

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  addRecentCommand: (commandId: string) => void;
  registerCommands: (groupName: string, commands: Command[]) => void;
  unregisterCommands: (groupName: string) => void;
}

const MAX_RECENT_COMMANDS = 5;

export const useCommandPaletteStore = create<CommandPaletteState>()(
  devtools(
    (set) => ({
      isOpen: false,
      recentCommands: [],
      customCommands: {},

      open: () => set({ isOpen: true }, false, "openCommandPalette"),

      close: () => set({ isOpen: false }, false, "closeCommandPalette"),

      toggle: () =>
        set(
          (state) => ({ isOpen: !state.isOpen }),
          false,
          "toggleCommandPalette",
        ),

      addRecentCommand: (commandId: string) =>
        set(
          (state) => {
            const newRecent = [
              commandId,
              ...state.recentCommands.filter((id) => id !== commandId),
            ].slice(0, MAX_RECENT_COMMANDS);
            return { recentCommands: newRecent };
          },
          false,
          "addRecentCommand",
        ),

      registerCommands: (groupName: string, commands: Command[]) =>
        set(
          (state) => ({
            customCommands: {
              ...state.customCommands,
              [groupName]: commands,
            },
          }),
          false,
          "registerCommands",
        ),

      unregisterCommands: (groupName: string) =>
        set(
          (state) => {
            const { [groupName]: removed, ...rest } = state.customCommands;
            void removed; // Acknowledge the removed value
            return { customCommands: rest };
          },
          false,
          "unregisterCommands",
        ),
    }),
    {
      name: "command-palette-storage",
    },
  ),
);
