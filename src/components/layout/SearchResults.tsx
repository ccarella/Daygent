"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  FolderOpen,
  GitBranch,
  Clock,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "issue" | "project" | "repository";
  title: string;
  description?: string;
  status?: string;
  repository?: string;
}

interface SearchResultsProps {
  query: string;
  recentSearches: string[];
  onSelectRecent: (search: string) => void;
  onClose: () => void;
}

export function SearchResults({
  query,
  recentSearches,
  onSelectRecent,
  onClose,
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Mock search function - replace with actual API call
  // Note: Error handling is implemented and will properly catch and display
  // errors when the actual search API is integrated
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Replace mock results with actual API implementation
      // Example: const results = await searchAPI(searchQuery);
      const mockResults: SearchResult[] = [
        {
          id: "1",
          type: "issue",
          title: `Fix authentication bug matching "${searchQuery}"`,
          description: "Users unable to login with GitHub OAuth",
          status: "open",
          repository: "daygent",
        },
        {
          id: "2",
          type: "project",
          title: `Project Alpha containing "${searchQuery}"`,
          description: "Main development project for Q1",
        },
        {
          id: "3",
          type: "repository",
          title: `Repository with "${searchQuery}"`,
          description: "github.com/ccarella/daygent",
        },
      ];

      setResults(mockResults);
    } catch (err) {
      console.error("Search failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while searching. Please try again.",
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Perform search when query changes
  useEffect(() => {
    performSearch(query);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = results.length + recentSearches.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();

        if (selectedIndex < recentSearches.length) {
          onSelectRecent(recentSearches[selectedIndex]);
        } else {
          const resultIndex = selectedIndex - recentSearches.length;
          const result = results[resultIndex];
          if (result) {
            // TODO: Navigate to result
            onClose();
          }
        }
      }
    };

    const element = resultsRef.current;
    if (element) {
      element.addEventListener("keydown", handleKeyDown);
      return () => element.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedIndex, results, recentSearches, onSelectRecent, onClose]);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "issue":
        return <FileText className="h-4 w-4" />;
      case "project":
        return <FolderOpen className="h-4 w-4" />;
      case "repository":
        return <GitBranch className="h-4 w-4" />;
    }
  };

  const showRecentSearches = !query && recentSearches.length > 0;
  const showError = query && !loading && error;
  const showNoResults = query && !loading && !error && results.length === 0;

  return (
    <Card className="overflow-hidden shadow-lg" ref={resultsRef}>
      <ScrollArea className="max-h-[400px]">
        {/* Recent searches */}
        {showRecentSearches && (
          <div className="p-2">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Recent searches
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={search}
                onClick={() => onSelectRecent(search)}
                className={cn(
                  "flex w-full items-center space-x-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                  selectedIndex === index && "bg-accent text-accent-foreground",
                )}
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{search}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            className="flex items-center justify-center p-8"
            role="status"
            aria-label="Loading search results"
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading search results...</span>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="mb-2 h-8 w-8 text-destructive/50" />
            <p className="text-sm font-medium text-destructive">
              Search failed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Search results */}
        {!loading && !error && results.length > 0 && (
          <>
            {showRecentSearches && <Separator />}
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Search results
              </div>
              {results.map((result, index) => {
                const actualIndex = showRecentSearches
                  ? recentSearches.length + index
                  : index;
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      // TODO: Navigate to result
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-start space-x-2 rounded-sm px-2 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                      selectedIndex === actualIndex &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <div className="mt-0.5">{getIcon(result.type)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-medium">{result.title}</div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground">
                          {result.description}
                        </div>
                      )}
                      {result.status && (
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span className="capitalize">{result.status}</span>
                          {result.repository && (
                            <>
                              <span>•</span>
                              <span>{result.repository}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Search className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {/* Help text */}
        {!query && !showRecentSearches && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>Type to search issues, projects, and repositories</p>
            <p className="mt-1 text-xs">
              Press <kbd className="rounded border px-1">↵</kbd> for full
              results
            </p>
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
