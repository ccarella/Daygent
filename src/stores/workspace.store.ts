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
  setWorkspaceBySlug: (slug: string) => Promise<boolean>;
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
        console.log("[WorkspaceStore] loadWorkspaces called");
        set({ isLoading: true, error: null });
        
        try {
          const supabase = createClient();
          
          // Add timeout to auth check
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Auth timeout")), 5000)
          );
          
          const authPromise = supabase.auth.getUser();
          
          let user;
          try {
            const authResult = await Promise.race([authPromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.getUser>>;
            user = authResult?.data?.user;
            console.log("[WorkspaceStore] Auth user:", user?.id);
          } catch (authError) {
            console.error("[WorkspaceStore] Auth error or timeout:", authError);
            // Try to get session instead
            try {
              console.log("[WorkspaceStore] Attempting getSession fallback...");
              const sessionResult = await supabase.auth.getSession();
              console.log("[WorkspaceStore] Session result:", sessionResult);
              user = sessionResult?.data?.session?.user;
              console.log("[WorkspaceStore] User from session:", user?.id);
            } catch (sessionError) {
              console.error("[WorkspaceStore] Session fallback also failed:", sessionError);
            }
          }
          
          if (!user) {
            console.log("[WorkspaceStore] No user found, clearing workspaces");
            set({ workspaces: [], currentWorkspace: null, isLoading: false });
            return;
          }

          console.log("[WorkspaceStore] User authenticated, loading workspaces for user:", user.id);

          // Get user's workspaces
          const { data: memberRecords, error } = await supabase
            .from("workspace_members")
            .select(`
              workspace_id,
              workspaces (
                id,
                name,
                slug,
                created_by,
                created_at,
                updated_at
              )
            `)
            .eq("user_id", user.id);

          console.log("[WorkspaceStore] Member records query result:", { memberRecords, error });

          if (error) throw error;

          const workspaces = memberRecords
            ?.map(record => record.workspaces as unknown as Workspace)
            .filter(ws => ws !== null) || [];

          console.log("[WorkspaceStore] Parsed workspaces:", workspaces);

          set({ workspaces, isLoading: false });

          // Set current workspace if not set
          const { currentWorkspace } = get();
          console.log("[WorkspaceStore] Current workspace in store:", currentWorkspace);
          
          if (!currentWorkspace && workspaces.length > 0) {
            // Try to restore from localStorage or use first workspace
            const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
            const savedWorkspace = workspaces.find(w => w.id === savedWorkspaceId);
            console.log("[WorkspaceStore] Auto-selecting workspace:", savedWorkspace || workspaces[0]);
            set({ currentWorkspace: savedWorkspace || workspaces[0] });
          }
        } catch (error) {
          console.error("[WorkspaceStore] Failed to load workspaces:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to load workspaces",
            isLoading: false 
          });
        } finally {
          // Ensure loading state is always cleared
          const state = get();
          if (state.isLoading) {
            console.log("[WorkspaceStore] Clearing loading state in finally block");
            set({ isLoading: false });
          }
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

      setWorkspaceBySlug: async (slug) => {
        console.log("[WorkspaceStore] setWorkspaceBySlug called with slug:", slug);
        const { workspaces } = get();
        console.log("[WorkspaceStore] Current workspaces in store:", workspaces);
        
        // First check if workspace is in current list
        const workspace = workspaces.find(w => w.slug === slug);
        if (workspace) {
          console.log("[WorkspaceStore] Found workspace in current list:", workspace);
          set({ currentWorkspace: workspace });
          localStorage.setItem("currentWorkspaceId", workspace.id);
          return true;
        }
        
        console.log("[WorkspaceStore] Workspace not found in current list");
        
        // If not found and workspaces aren't loaded, load them
        if (workspaces.length === 0) {
          console.log("[WorkspaceStore] No workspaces loaded, attempting to load...");
          await get().loadWorkspaces();
          const updatedWorkspaces = get().workspaces;
          console.log("[WorkspaceStore] Updated workspaces after load:", updatedWorkspaces);
          
          const foundWorkspace = updatedWorkspaces.find(w => w.slug === slug);
          if (foundWorkspace) {
            console.log("[WorkspaceStore] Found workspace after loading:", foundWorkspace);
            set({ currentWorkspace: foundWorkspace });
            localStorage.setItem("currentWorkspaceId", foundWorkspace.id);
            return true;
          }
        }
        
        console.log("[WorkspaceStore] Workspace not found with slug:", slug);
        // Workspace not found
        return false;
      },

      createWorkspace: async (data) => {
        set({ isLoading: true, error: null });
        
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) throw new Error("Not authenticated");

          // Call the database function to create workspace with member
          const { data: workspaceData, error } = await supabase
            .rpc("create_workspace_with_member", {
              p_name: data.name,
              p_slug: data.slug,
              p_user_id: user.id,
            });

          if (error) throw error;
          if (!workspaceData || !workspaceData[0]) throw new Error("Failed to create workspace");

          const workspace = workspaceData[0];

          // Reload workspaces to get the full list
          await get().loadWorkspaces();
          
          // Set as current workspace
          set({ currentWorkspace: workspace });

          return workspace;
        } catch (error) {
          console.error("Failed to create workspace:", error);
          set({ 
            error: error instanceof Error ? error.message : "Failed to create workspace",
            isLoading: false 
          });
          throw error;
        }
      },

      switchWorkspace: async (workspaceId) => {
        const workspace = get().workspaces.find(w => w.id === workspaceId);
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
              isLoading: false 
            });
          } catch (error) {
            console.error("Failed to switch workspace:", error);
            set({ 
              error: "Failed to switch workspace",
              isLoading: false 
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
          const workspaces = get().workspaces.map(w => 
            w.id === data.id ? data : w
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
        currentWorkspaceSlug: state.currentWorkspace?.slug,
      }),
    }
  )
);