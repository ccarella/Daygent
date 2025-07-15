"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  className?: string;
}

export function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { currentWorkspace, workspaces, switchWorkspace, isLoading } =
    useWorkspaceStore();

  const handleSwitch = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      router.push(`/${workspace.slug}/issues`);
    }
  };

  const handleCreateWorkspace = () => {
    router.push("/onboarding/workspace");
  };

  if (!currentWorkspace || isLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("justify-between", className)}>
          <span className="truncate">{currentWorkspace.name}</span>
          <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSwitch(workspace.id)}
            className="cursor-pointer"
          >
            <span className="flex-1">{workspace.name}</span>
            {workspace.id === currentWorkspace.id && (
              <Check className="ml-2 h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleCreateWorkspace}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
