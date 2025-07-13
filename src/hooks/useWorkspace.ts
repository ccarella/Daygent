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
        .from("workspaces")
        .select(
          `
          *,
          workspace_members!inner(
            user_id
          )
        `,
        )
        .eq("workspace_members.user_id", user.id);

      if (error) throw error;

      setWorkspaces(data || []);

      // Set active workspace if not already set
      if (data && data.length > 0 && !activeWorkspace) {
        // Check localStorage for saved preference
        const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
        const savedWorkspace = data.find((ws) => ws.id === savedWorkspaceId);

        if (savedWorkspace) {
          setActiveWorkspace(savedWorkspace);
        } else {
          // Default to first workspace (likely the owner one)
          const ownerWorkspace =
            data.find((ws) => ws.created_by === user.id) ||
            data[0];
          setActiveWorkspace(ownerWorkspace);
        }
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem("activeWorkspaceId", workspace.id);
  };

  return {
    activeWorkspace,
    workspaces,
    isLoading,
    setActiveWorkspace: switchWorkspace,
    reload: loadWorkspaces,
  };
}