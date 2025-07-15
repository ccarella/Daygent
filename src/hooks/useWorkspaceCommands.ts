"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useCommandPaletteStore } from "@/stores/commandPalette.store";
import { Building2, Plus } from "lucide-react";

export function useWorkspaceCommands() {
  const router = useRouter();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspaceStore();
  const { registerCommands } = useCommandPaletteStore();

  useEffect(() => {
    // Create workspace switching commands
    const workspaceCommands = workspaces.map((workspace) => ({
      id: `switch-workspace-${workspace.id}`,
      title: `Switch to ${workspace.name}`,
      description:
        workspace.id === currentWorkspace?.id
          ? "Current workspace"
          : "Switch workspace",
      icon: Building2,
      action: async () => {
        await switchWorkspace(workspace.id);
        router.push(`/${workspace.slug}/issues`);
      },
      keywords: [
        "workspace",
        "switch",
        workspace.name.toLowerCase(),
        workspace.slug,
      ],
    }));

    // Add create workspace command
    const createWorkspaceCommand = {
      id: "create-workspace",
      title: "Create New Workspace",
      description: "Create a new workspace",
      icon: Plus,
      action: () => {
        router.push("/onboarding/workspace");
      },
      keywords: ["create", "new", "workspace", "add"],
    };

    // Register all workspace commands
    const allCommands = [...workspaceCommands, createWorkspaceCommand];

    // Register commands with the command palette
    registerCommands("workspace", allCommands);

    // Cleanup function to unregister commands when component unmounts
    return () => {
      // The command palette store should handle cleanup automatically
      // when the same key is registered again
    };
  }, [workspaces, currentWorkspace, switchWorkspace, router, registerCommands]);
}
