import { useWorkspaceStore } from "@/stores/workspace.store";
import type { Organization } from "@/types/organization";

// Compatibility wrapper for components still using useOrganization
// Maps workspace terminology to organization terminology
export function useOrganization() {
  const { 
    currentWorkspace: activeOrganization, 
    workspaces: organizations, 
    setCurrentWorkspace,
    isLoading,
    loadWorkspaces
  } = useWorkspaceStore();
  
  const setActiveOrganization = (org: Organization | null) => {
    if (org) {
      // Convert Organization to Workspace type
      const workspace = {
        ...org,
        subscription_id: org.subscription_id ?? null,
        trial_ends_at: org.trial_ends_at ?? null,
        description: org.description ?? null,
        created_by: org.id, // Use a placeholder since Organization doesn't have created_by
      };
      setCurrentWorkspace(workspace);
    } else {
      setCurrentWorkspace(null);
    }
  };

  return {
    activeOrganization,
    organizations,
    isLoading,
    setActiveOrganization,
    reload: loadWorkspaces,
  };
}