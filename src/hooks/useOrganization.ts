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
    setCurrentWorkspace(org);
  };

  return {
    activeOrganization,
    organizations,
    isLoading,
    setActiveOrganization,
    reload: loadWorkspaces,
  };
}