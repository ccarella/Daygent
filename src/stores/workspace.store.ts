import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

// Using workspaces table
type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

interface WorkspaceState {
  // State
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (data: { name: string; slug: string }) => Promise<Workspace>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadWorkspaces: async () => {
        set({ isLoading: true, error: null });

        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            set({ workspaces: [], currentWorkspace: null, isLoading: false });
            return;
          }

          // Get user's workspaces
          const { data: memberRecords, error } = await supabase
            .from("workspace_members")
            .select(
              `
              workspace_id,
              workspaces (
                id,
                name,
                slug,
                created_by,
                created_at,
                updated_at
              )
            `,
            )
            .eq("user_id", user.id);

          if (error) throw error;

          const workspaces =
            memberRecords
              ?.map((record) => record.workspaces as unknown as Workspace)
              .filter((ws) => ws !== null) || [];

          set({ workspaces, isLoading: false });

          // Set current workspace if not set
          const { currentWorkspace } = get();
          if (!currentWorkspace && workspaces.length > 0) {
            // Try to restore from localStorage or use first workspace
            const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
            const savedWorkspace = workspaces.find(
              (w) => w.id === savedWorkspaceId,
            );
            set({ currentWorkspace: savedWorkspace || workspaces[0] });
          }
        } catch (error) {
          console.error("Failed to load workspaces:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load workspaces",
            isLoading: false,
          });
        }
      },

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace });
        if (workspace) {
          localStorage.setItem("currentWorkspaceId", workspace.id);
        } else {
          localStorage.removeItem("currentWorkspaceId");
        }
      },

      createWorkspace: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) throw new Error("Not authenticated");

          // Call the database function to create workspace with member
          const { data: workspaceData, error } = await supabase.rpc(
            "create_workspace_with_member",
            {
              p_name: data.name,
              p_slug: data.slug,
              p_user_id: user.id,
            },
          );

          if (error) throw error;
          if (!workspaceData || !workspaceData[0])
            throw new Error("Failed to create workspace");

          const workspace = workspaceData[0];

          // Reload workspaces to get the full list
          await get().loadWorkspaces();

          // Set as current workspace
          set({ currentWorkspace: workspace });

          return workspace;
        } catch (error) {
          console.error("Failed to create workspace:", error);
          set({
            error:
              error instanceof Error
                ? error.message
                : "Failed to create workspace",
            isLoading: false,
          });
          throw error;
        }
      },

      switchWorkspace: async (workspaceId) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          set({ currentWorkspace: workspace });
        } else {
          // Load workspace if not in cache
          set({ isLoading: true });
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from("workspaces")
              .select("*")
              .eq("id", workspaceId)
              .single();

            if (error) throw error;

            set({
              currentWorkspace: data,
              workspaces: [...get().workspaces, data],
              isLoading: false,
            });
          } catch (error) {
            console.error("Failed to switch workspace:", error);
            set({
              error: "Failed to switch workspace",
              isLoading: false,
            });
          }
        }
      },

      refreshCurrentWorkspace: async () => {
        const { currentWorkspace } = get();
        if (!currentWorkspace) return;

        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", currentWorkspace.id)
            .single();

          if (error) throw error;

          set({ currentWorkspace: data });

          // Update in workspaces array too
          const workspaces = get().workspaces.map((w) =>
            w.id === data.id ? data : w,
          );
          set({ workspaces });
        } catch (error) {
          console.error("Failed to refresh workspace:", error);
        }
      },

      reset: () => {
        set(initialState);
        localStorage.removeItem("currentWorkspaceId");
      },
    }),
    {
      name: "workspace-store",
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspace?.id,
      }),
    },
  ),
);
