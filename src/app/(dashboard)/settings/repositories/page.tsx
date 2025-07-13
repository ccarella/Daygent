"use client";

import { useState, useEffect } from "react";
import { useRepositories } from "@/hooks/useRepositories";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import {
  Search,
  GitBranch,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";

export default function RepositoriesPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();
  const {
    repositories,
    pagination,
    isLoading,
    error,
    selectedRepos,
    searchQuery,
    setSearchQuery,
    toggleRepoSelection,
    selectAll,
    deselectAll,
    fetchRepositories,
    connectSelectedRepositories,
    isConnecting,
    connectingRepos,
  } = useRepositories();

  const [searchInput, setSearchInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTimer, setSuccessTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput, setSearchQuery]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimer) {
        clearTimeout(successTimer);
      }
    };
  }, [successTimer]);

  const handleConnect = async () => {
    try {
      await connectSelectedRepositories();
      setShowSuccess(true);

      // Clear any existing timer
      if (successTimer) {
        clearTimeout(successTimer);
      }

      // Set new timer
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      setSuccessTimer(timer);
    } catch (err) {
      console.error("Failed to connect repositories:", err);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    if (successTimer) {
      clearTimeout(successTimer);
      setSuccessTimer(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchRepositories(newPage);
  };

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>
            Please select a workspace from the sidebar to manage
            repositories.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const unconnectedRepos = repositories.filter((repo) => !repo.is_connected);
  const hasSelection = selectedRepos.size > 0;
  const allUnconnectedSelected =
    unconnectedRepos.length > 0 &&
    unconnectedRepos.every((repo) => selectedRepos.has(repo.id));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connect Repositories</h1>
          <p className="text-muted-foreground mt-2">
            Select GitHub repositories to connect to {currentWorkspace.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchRepositories(pagination?.page || 1)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {showSuccess && (
        <Alert className="border-green-500 bg-green-50 relative">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success!</AlertTitle>
          <AlertDescription className="text-green-700">
            Selected repositories have been connected successfully.
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={handleCloseSuccess}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {error && (
        <Alert className="border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search repositories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        {unconnectedRepos.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={allUnconnectedSelected ? deselectAll : selectAll}
          >
            {allUnconnectedSelected ? "Deselect All" : "Select All"}
          </Button>
        )}
        {hasSelection && (
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect {selectedRepos.size} Repositor
                {selectedRepos.size === 1 ? "y" : "ies"}
              </>
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : repositories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No repositories found
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery
                ? `No repositories match "${searchQuery}"`
                : "You don't have any GitHub repositories accessible with your current permissions."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => (
              <Card
                key={repo.id}
                className={`relative transition-colors ${
                  repo.is_connected
                    ? "border-muted opacity-75"
                    : selectedRepos.has(repo.id)
                      ? "border-primary"
                      : ""
                } ${connectingRepos.has(repo.id) ? "opacity-60" : ""}`}
              >
                {connectingRepos.has(repo.id) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Connecting...
                      </span>
                    </div>
                  </div>
                )}
                {!repo.is_connected && (
                  <div className="absolute top-4 right-4">
                    <Checkbox
                      checked={selectedRepos.has(repo.id)}
                      onCheckedChange={() => toggleRepoSelection(repo.id)}
                      disabled={connectingRepos.has(repo.id)}
                    />
                  </div>
                )}
                <CardHeader className="pr-12">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {repo.name}
                    {repo.private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {repo.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{repo.owner.login}</span>
                    <span>•</span>
                    <span>{repo.default_branch}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  {repo.is_connected ? (
                    <Badge
                      variant="secondary"
                      className="w-full justify-center"
                    >
                      Already Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center">
                      Available to Connect
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {pagination && (pagination.has_next || pagination.has_prev) && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((pagination.page || 1) - 1)}
                disabled={!pagination.has_prev || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((pagination.page || 1) + 1)}
                disabled={!pagination.has_next || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.push("/projects/new")}>
          Skip for Now
        </Button>
        {repositories.some((r) => r.is_connected) && (
          <Button onClick={() => router.push("/projects/new")}>
            Continue to Projects
          </Button>
        )}
      </div>
    </div>
  );
}
