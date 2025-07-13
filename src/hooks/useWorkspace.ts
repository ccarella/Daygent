import { useWorkspaceStore } from "@/stores/workspace.store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useWorkspace(required = true) {
  const router = useRouter();
  const { 
    currentWorkspace, 
    workspaces, 
    isLoading, 
    error
  } = useWorkspaceStore();

  useEffect(() => {
    if (!isLoading && required && !currentWorkspace && workspaces.length === 0) {
      // No workspace available, redirect to creation
      router.push("/onboarding/workspace");
    }
  }, [currentWorkspace, workspaces, isLoading, required, router]);

  return {
    workspace: currentWorkspace,
    workspaces,
    isLoading,
    error,
    hasWorkspace: !!currentWorkspace,
  };
}

// Hook for workspace-specific data fetching
export function useWorkspaceData<T>(
  fetcher: (workspaceId: string) => Promise<T>
) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspace) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await fetcher(workspace.id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch data"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  return { data, loading, error };
}