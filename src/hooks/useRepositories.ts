"use client";

import { useState, useCallback, useEffect } from "react";
import { useOrganization } from "./useOrganization";
import type {
  GitHubRepository,
  PaginationInfo,
} from "@/services/github.service";

interface RepositoryWithStatus extends GitHubRepository {
  is_connected: boolean;
}

interface UseRepositoriesReturn {
  repositories: RepositoryWithStatus[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  selectedRepos: Set<number>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleRepoSelection: (repoId: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  fetchRepositories: (page?: number) => Promise<void>;
  connectSelectedRepositories: () => Promise<void>;
  disconnectRepositories: (repositoryIds: string[]) => Promise<void>;
  isConnecting: boolean;
}

export function useRepositories(): UseRepositoriesReturn {
  const { activeOrganization } = useOrganization();
  const [repositories, setRepositories] = useState<RepositoryWithStatus[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchRepositories = useCallback(
    async (page = 1) => {
      if (!activeOrganization) {
        setError("No active organization");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: "30",
          organization_id: activeOrganization.id,
        });

        if (searchQuery) {
          params.append("search", searchQuery);
        }

        const response = await fetch(`/api/repositories?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch repositories");
        }

        const data = await response.json();
        setRepositories(data.repositories);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Error fetching repositories:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch repositories",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeOrganization, searchQuery],
  );

  const toggleRepoSelection = useCallback((repoId: number) => {
    setSelectedRepos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const unconnectedRepos = repositories
      .filter((repo) => !repo.is_connected)
      .map((repo) => repo.id);
    setSelectedRepos(new Set(unconnectedRepos));
  }, [repositories]);

  const deselectAll = useCallback(() => {
    setSelectedRepos(new Set());
  }, []);

  const connectSelectedRepositories = useCallback(async () => {
    if (!activeOrganization || selectedRepos.size === 0) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const reposToConnect = repositories
        .filter((repo) => selectedRepos.has(repo.id))
        .map((repo) => ({
          github_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          default_branch: repo.default_branch,
        }));

      const response = await fetch("/api/repositories/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: activeOrganization.id,
          repositories: reposToConnect,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to connect repositories");
      }

      const result = await response.json();

      setSelectedRepos(new Set());

      await fetchRepositories(pagination?.page || 1);

      return result;
    } catch (err) {
      console.error("Error connecting repositories:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect repositories",
      );
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [
    activeOrganization,
    selectedRepos,
    repositories,
    fetchRepositories,
    pagination,
  ]);

  const disconnectRepositories = useCallback(
    async (repositoryIds: string[]) => {
      if (!activeOrganization || repositoryIds.length === 0) {
        return;
      }

      setError(null);

      try {
        const response = await fetch("/api/repositories/disconnect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organization_id: activeOrganization.id,
            repository_ids: repositoryIds,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to disconnect repositories",
          );
        }

        await fetchRepositories(pagination?.page || 1);
      } catch (err) {
        console.error("Error disconnecting repositories:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to disconnect repositories",
        );
        throw err;
      }
    },
    [activeOrganization, fetchRepositories, pagination],
  );

  useEffect(() => {
    if (activeOrganization) {
      fetchRepositories(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganization]);

  return {
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
    disconnectRepositories,
    isConnecting,
  };
}
