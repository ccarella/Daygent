"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  Loader2,
  Building2,
  User,
  Settings,
  RefreshCw,
} from "lucide-react";

interface GitHubInstallation {
  id: string;
  installation_id: number;
  github_account_name: string;
  github_account_type: string;
  installed_at: string;
  installed_by: string;
}

export default function GitHubSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useWorkspaceStore();
  const [installation, setInstallation] = useState<GitHubInstallation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for success/error messages from callback
  const success = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const fetchInstallation = useCallback(async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("github_installations")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      setInstallation(data);
    } catch (err) {
      console.error("Error fetching GitHub installation:", err);
      setError("Failed to load GitHub installation status");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchInstallation();
    }
  }, [currentWorkspace, fetchInstallation]);

  const handleConnect = async () => {
    if (!currentWorkspace) return;

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/github/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initiate GitHub connection");
      }

      const { install_url } = await response.json();
      
      // Redirect to GitHub App installation page
      window.location.href = install_url;
    } catch (err) {
      console.error("Error connecting GitHub:", err);
      setError(err instanceof Error ? err.message : "Failed to connect GitHub");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentWorkspace || !installation) return;

    const confirmed = window.confirm(
      "Are you sure you want to disconnect GitHub? This will remove access to all connected repositories."
    );

    if (!confirmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("github_installations")
        .delete()
        .eq("workspace_id", currentWorkspace.id);

      if (deleteError) throw deleteError;

      setInstallation(null);
      
      // Also clear any connected repositories
      await supabase
        .from("repositories")
        .delete()
        .eq("workspace_id", currentWorkspace.id);

    } catch (err) {
      console.error("Error disconnecting GitHub:", err);
      setError("Failed to disconnect GitHub");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Workspace Selected</AlertTitle>
          <AlertDescription>
            Please select a workspace from the sidebar to manage GitHub settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GitHub Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your GitHub account to import and sync repositories
        </p>
      </div>

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Connected Successfully!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your GitHub account has been connected. You can now import repositories.
          </AlertDescription>
        </Alert>
      )}

      {errorParam && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Failed</AlertTitle>
          <AlertDescription>
            {errorParam === "missing_params" && "Missing required parameters. Please try again."}
            {errorParam === "invalid_workspace" && "Invalid workspace. Please try again."}
            {errorParam === "token_exchange_failed" && "Failed to authenticate with GitHub. Please try again."}
            {errorParam === "no_access_token" && "No access token received from GitHub. Please try again."}
            {errorParam === "installation_fetch_failed" && "Failed to get installation details. Please try again."}
            {errorParam === "storage_failed" && "Failed to save installation. Please try again."}
            {errorParam === "unexpected" && "An unexpected error occurred. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>GitHub App Connection</CardTitle>
          <CardDescription>
            Connect your GitHub account to enable repository imports and issue synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : installation ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Github className="h-8 w-8" />
                    <div>
                      <p className="font-semibold text-lg">{installation.github_account_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {installation.github_account_type === "Organization" ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span>{installation.github_account_type}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Connected on {new Date(installation.installed_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/settings/repositories")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Repositories
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInstallation()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect GitHub
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Github className="h-8 w-8" />
                <p>No GitHub account connected</p>
              </div>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Connect GitHub Account
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About GitHub Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">What you can do with GitHub integration:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Import repositories from your GitHub account</li>
              <li>Sync issues between GitHub and Daygent</li>
              <li>Automatically track issue updates</li>
              <li>Create AI-enhanced issue descriptions</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Required permissions:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Read access to repositories and issues</li>
              <li>Write access to create and update issues</li>
              <li>Webhook access for real-time updates</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can manage which repositories to import after connecting your GitHub account.
              Only repositories you explicitly select will be accessible by Daygent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}