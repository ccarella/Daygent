// Compatibility wrapper for components still using useOrganization
// This redirects to the new workspace store

import { useWorkspaceStore } from "@/stores/workspace.store";

export function useOrganization() {
  const { currentWorkspace, workspaces, isLoading, error } = useWorkspaceStore();

  return {
    activeOrganization: currentWorkspace,
    organizations: workspaces,
    isLoading,
    error,
    hasOrganization: !!currentWorkspace,
  };
}