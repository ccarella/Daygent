"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  CircleDot,
  FolderOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";

// Interfaces for type safety
export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

export interface CommandGroup {
  heading: string;
  commands: Command[];
}

export function CommandPalette() {
  const router = useRouter();
  const { isOpen, close, addRecentCommand, customCommands, recentCommands } =
    useCommandPaletteStore();

  // Navigation commands
  const navigationCommands = useMemo<Command[]>(
    () => [
      {
        id: "nav-dashboard",
        title: "Go to Dashboard",
        description: "View your project dashboard",
        icon: LayoutDashboard,
        action: () => {
          router.push("/issues");
          addRecentCommand("nav-dashboard");
          close();
        },
        keywords: ["home", "overview"],
      },
      {
        id: "nav-issues",
        title: "Go to Issues",
        description: "View and manage issues",
        icon: CircleDot,
        action: () => {
          router.push("/issues");
          addRecentCommand("nav-issues");
          close();
        },
        keywords: ["tasks", "tickets", "bugs"],
      },
      {
        id: "nav-projects",
        title: "Go to Projects",
        description: "View your projects",
        icon: FolderOpen,
        action: () => {
          router.push("/projects");
          addRecentCommand("nav-projects");
          close();
        },
        keywords: ["repositories", "repos"],
      },
      {
        id: "nav-settings",
        title: "Go to Settings",
        description: "Manage your account settings",
        icon: Settings,
        action: () => {
          router.push("/settings");
          addRecentCommand("nav-settings");
          close();
        },
        keywords: ["preferences", "account", "profile"],
      },
    ],
    [router, addRecentCommand, close],
  );

  // Combine all commands
  const allCommands = useMemo(() => {
    const commandMap = new Map<string, Command>();

    // Add navigation commands
    navigationCommands.forEach((cmd) => commandMap.set(cmd.id, cmd));

    // Add custom commands from other features
    Object.values(customCommands).forEach((commands) => {
      commands.forEach((cmd) => commandMap.set(cmd.id, cmd));
    });

    return commandMap;
  }, [customCommands, navigationCommands]);

  // Build command groups including recent commands
  const commandGroups = useMemo(() => {
    const groups: CommandGroup[] = [];

    // Add recent commands if any
    if (recentCommands.length > 0) {
      const recentCommandObjects = recentCommands
        .map((id) => allCommands.get(id))
        .filter((cmd): cmd is Command => cmd !== undefined);

      if (recentCommandObjects.length > 0) {
        groups.push({
          heading: "Recent",
          commands: recentCommandObjects,
        });
      }
    }

    // Add navigation group
    groups.push({
      heading: "Navigation",
      commands: navigationCommands,
    });

    // Add custom command groups
    Object.entries(customCommands).forEach(([groupName, commands]) => {
      if (commands.length > 0) {
        groups.push({
          heading: groupName,
          commands,
        });
      }
    });

    return groups;
  }, [recentCommands, customCommands, allCommands, navigationCommands]);

  return (
    <CommandDialog open={isOpen} onOpenChange={close}>
      <CommandInput
        placeholder="Type a command or search..."
        className="h-12"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commandGroups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.commands.map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.title} ${command.keywords?.join(" ") || ""}`}
                onSelect={() => command.action()}
                className="cursor-pointer"
              >
                {command.icon && (
                  <command.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                <div className="flex flex-col">
                  <span>{command.title}</span>
                  {command.description && (
                    <span className="text-sm text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </div>
                {command.shortcut && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {command.shortcut}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
