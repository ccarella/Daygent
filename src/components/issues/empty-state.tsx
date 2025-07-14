"use client";

import { useState, useEffect } from "react";
import { Package, Download, Loader2, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Repository {
  id: string;
  name: string;
  full_name: string;
}

interface EmptyStateProps {
  workspaceId: string;
  workspaceSlug: string;
}

export function IssuesEmptyState({
  workspaceId,
  workspaceSlug,
}: EmptyStateProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const loadRepositories = async () => {
      try {
        const { data, error } = await supabase
          .from("repositories")
          .select("id, name, full_name")
          .eq("workspace_id", workspaceId);

        if (error) {
          console.error("Error loading repositories:", error);
          toast.error("Failed to load repositories");
        } else {
          setRepositories(data || []);
        }
      } catch (err) {
        console.error("Error loading repositories:", err);
        toast.error("Failed to load repositories");
      } finally {
        setLoading(false);
      }
    };

    loadRepositories();
  }, [workspaceId, supabase]);

  const handleSync = async (repositoryId: string) => {
    setSyncing(repositoryId);

    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/sync-issues`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ full_sync: true }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sync issues");
      }

      const result = await response.json();

      toast.success(`Successfully imported ${result.synced} issues`);

      // Refresh the page to show the imported issues
      window.location.reload();
    } catch (err) {
      console.error("Error syncing issues:", err);
      toast.error(err instanceof Error ? err.message : "Failed to sync issues");
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Github className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Connect a repository first
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            You need to connect GitHub repositories before you can import
            issues.
          </p>
          <Button asChild>
            <Link href={`/${workspaceSlug}/settings/repositories`}>
              <Github className="mr-2 h-4 w-4" />
              Connect Repositories
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No issues yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Import issues from your GitHub repositories to get started
        </p>
        <div className="space-y-3">
          {repositories.map((repo) => (
            <Button
              key={repo.id}
              onClick={() => handleSync(repo.id)}
              disabled={syncing === repo.id}
              variant="default"
              className="w-full"
            >
              {syncing === repo.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing from {repo.name}...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import from {repo.name}
                </>
              )}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          This will import all open and closed issues from your repositories
        </p>
      </CardContent>
    </Card>
  );
}
