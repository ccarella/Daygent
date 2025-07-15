"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  github_username: string | null;
}

export default function DebugOrgPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const checkUserAndWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError("Not authenticated");
        return;
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        setError(`Failed to fetch user profile: ${profileError.message}`);
        return;
      }

      setUser(userProfile);

      // Get user's workspaces
      const { data: workspaceData, error: workspacesError } = await supabase
        .from("workspace_members")
        .select(
          `
          workspace_id,
          workspace:workspaces(*)
        `,
        )
        .eq("user_id", authUser.id);

      if (workspacesError) {
        setError(`Failed to fetch workspaces: ${workspacesError.message}`);
        return;
      }

      const workspaces =
        workspaceData
          ?.map(
            (item: { workspace: unknown }) =>
              item.workspace as Workspace | null,
          )
          .filter((ws): ws is Workspace => ws !== null) || [];
      setWorkspaces(workspaces);
    } catch (err) {
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkUserAndWorkspaces();
  }, [checkUserAndWorkspaces]);

  const createWorkspace = async () => {
    if (!user) return;

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      // Call the API route to create workspace
      const response = await fetch("/api/debug/create-workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create workspace");
        return;
      }

      setSuccess(data.message);

      // Refresh workspaces list
      await checkUserAndWorkspaces();
    } catch (err) {
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Debug Tool</CardTitle>
          <CardDescription>
            Check and manage workspaces for the current user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          {user && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Current User</h3>
              <div className="text-sm space-y-1">
                <p>
                  <strong>ID:</strong> {user.id}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Name:</strong> {user.name || "Not set"}
                </p>
                <p>
                  <strong>GitHub Username:</strong>{" "}
                  {user.github_username || "Not set"}
                </p>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Workspaces */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Workspaces</h3>
            {workspaces.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No workspaces found for this user.
                </p>
                <Button
                  onClick={createWorkspace}
                  disabled={creating}
                  className="w-full sm:w-auto"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Default Workspace
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces.map((workspace) => (
                  <Card key={workspace.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{workspace.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Slug</p>
                          <p className="font-medium">{workspace.slug}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ID</p>
                          <p className="font-medium text-xs">{workspace.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(
                              workspace.created_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={checkUserAndWorkspaces} variant="outline">
              Refresh
            </Button>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
