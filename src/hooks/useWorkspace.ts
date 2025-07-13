import { useAuthStore } from "@/stores/auth.store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/types/workspace";

const supabase = createClient();

export function useWorkspace() {
  const { user } = useAuthStore();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsLoading(false);
      return;
    }

    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadWorkspaces = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(
          `
          workspace_id,
          workspace:workspaces(*)
        `,
        )
        .eq("user_id", user.id);

      if (error) throw error;

      const workspacesList = data
        ?.map((item: { workspace: unknown }) => item.workspace as Workspace | null)
        .filter((ws): ws is Workspace => ws !== null) || [];
      setWorkspaces(workspacesList);

      // Set active workspace if not already set
      if (workspacesList.length > 0 && !activeWorkspace) {
        // Check localStorage for saved preference
        const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
        const savedWorkspace = workspacesList.find((ws) => ws?.id === savedWorkspaceId);

        if (savedWorkspace) {
          setActiveWorkspace(savedWorkspace);
        } else {
          // Default to first workspace
          setActiveWorkspace(workspacesList[0]);
        }
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActiveWorkspace = (workspace: Workspace | null) => {
    setActiveWorkspace(workspace);
    // Store in localStorage for persistence
    if (workspace) {
      localStorage.setItem("activeWorkspaceId", workspace.id);
    } else {
      localStorage.removeItem("activeWorkspaceId");
    }
  };

  return {
    activeWorkspace,
    workspaces,
    isLoading,
    setActiveWorkspace: handleSetActiveWorkspace,
    reload: loadWorkspaces,
  };
}