"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";

export function WorkspaceSync() {
  const pathname = usePathname();
  const router = useRouter();
  const { setWorkspaceBySlug, loadWorkspaces, workspaces, currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    // Extract workspace slug from pathname
    const segments = pathname.split("/");
    const workspaceSlug = segments[1]; // e.g., /daygen/issues -> "daygen"

    if (!workspaceSlug) return;

    const syncWorkspace = async () => {
      // If no workspaces loaded yet, load them first
      if (workspaces.length === 0) {
        await loadWorkspaces();
      }
      
      // Try to set workspace by slug
      const found = await setWorkspaceBySlug(workspaceSlug);
      
      // If workspace not found, redirect to first available workspace or login
      if (!found) {
        const updatedWorkspaces = useWorkspaceStore.getState().workspaces;
        if (updatedWorkspaces.length > 0) {
          // Redirect to first workspace
          const firstWorkspace = updatedWorkspaces[0];
          router.replace(`/${firstWorkspace.slug}/issues`);
        } else {
          // No workspaces available, redirect to login
          router.replace("/login");
        }
      }
    };

    // Only sync if current workspace doesn't match URL
    if (!currentWorkspace || currentWorkspace.slug !== workspaceSlug) {
      syncWorkspace();
    }
  }, [pathname, workspaces.length, currentWorkspace, setWorkspaceBySlug, loadWorkspaces, router]);

  // This component doesn't render anything
  return null;
}