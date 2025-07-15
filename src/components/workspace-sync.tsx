"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";

export function WorkspaceSync() {
  const pathname = usePathname();
  const router = useRouter();
  const { setWorkspaceBySlug, loadWorkspaces, workspaces, currentWorkspace } = useWorkspaceStore();

  console.log("[WorkspaceSync] Component mounted, pathname:", pathname);
  console.log("[WorkspaceSync] Current workspace:", currentWorkspace);
  console.log("[WorkspaceSync] Available workspaces:", workspaces);

  useEffect(() => {
    // Extract workspace slug from pathname
    const segments = pathname.split("/");
    const workspaceSlug = segments[1]; // e.g., /daygen/issues -> "daygen"

    console.log("[WorkspaceSync] Effect running, extracted slug:", workspaceSlug);

    if (!workspaceSlug) {
      console.log("[WorkspaceSync] No workspace slug found, returning");
      return;
    }

    const syncWorkspace = async () => {
      console.log("[WorkspaceSync] Starting sync process");
      
      try {
        // If no workspaces loaded yet, load them first
        if (workspaces.length === 0) {
          console.log("[WorkspaceSync] No workspaces loaded, loading now...");
          
          // Add timeout for workspace loading
          const loadPromise = loadWorkspaces();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Workspace loading timeout")), 10000)
          );
          
          try {
            await Promise.race([loadPromise, timeoutPromise]);
            console.log("[WorkspaceSync] Workspaces loaded successfully");
          } catch (loadError) {
            console.error("[WorkspaceSync] Error loading workspaces:", loadError);
            // Continue anyway - maybe we can still work with cached data
          }
          
          // Check what we have after loading attempt
          const afterLoadWorkspaces = useWorkspaceStore.getState().workspaces;
          console.log("[WorkspaceSync] Workspaces after load attempt:", afterLoadWorkspaces);
        }
        
        // Try to set workspace by slug
        console.log("[WorkspaceSync] Attempting to set workspace by slug:", workspaceSlug);
        const found = await setWorkspaceBySlug(workspaceSlug);
        console.log("[WorkspaceSync] Workspace found:", found);
        
        // If workspace not found, redirect to first available workspace or login
        if (!found) {
          const updatedWorkspaces = useWorkspaceStore.getState().workspaces;
          console.log("[WorkspaceSync] Workspace not found, updated workspaces:", updatedWorkspaces);
          
          if (updatedWorkspaces.length > 0) {
            // Redirect to first workspace
            const firstWorkspace = updatedWorkspaces[0];
            console.log("[WorkspaceSync] Redirecting to first workspace:", firstWorkspace.slug);
            router.replace(`/${firstWorkspace.slug}/issues`);
          } else {
            // No workspaces available, redirect to login
            console.log("[WorkspaceSync] No workspaces available, redirecting to login");
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("[WorkspaceSync] Error in sync process:", error);
      }
    };

    // Only sync if current workspace doesn't match URL
    if (!currentWorkspace || currentWorkspace.slug !== workspaceSlug) {
      console.log("[WorkspaceSync] Workspace mismatch, syncing...");
      syncWorkspace();
    } else {
      console.log("[WorkspaceSync] Workspace already matches URL, skipping sync");
    }
  }, [pathname, workspaces.length, currentWorkspace, setWorkspaceBySlug, loadWorkspaces, router]);

  // This component doesn't render anything visible
  // But let's add a hidden div to verify it's mounting
  return <div data-testid="workspace-sync-mounted" style={{ display: 'none' }}>WorkspaceSync Mounted</div>;
}