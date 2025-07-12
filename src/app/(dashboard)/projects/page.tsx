"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GitBranch, FolderOpen, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Repository {
  id: string;
  name: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  repository_id: string;
  repositories: Repository;
}

export default function ProjectsPage() {
  const { activeOrganization, isLoading: orgLoading } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeOrganization) return;

      setIsLoading(true);
      setError(null);

      try {
        const [projectsResponse, reposResponse] = await Promise.all([
          fetch(`/api/projects?organization_id=${activeOrganization.id}`),
          fetch(`/api/repositories/connected?organization_id=${activeOrganization.id}`),
        ]);

        if (!projectsResponse.ok || !reposResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const projectsData = await projectsResponse.json();
        const reposData = await reposResponse.json();

        setProjects(projectsData.projects || []);
        setRepositories(reposData.repositories || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load projects. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (activeOrganization && !orgLoading) {
      fetchData();
    }
  }, [activeOrganization, orgLoading]);

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <Alert className="max-w-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select an organization to view projects.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your GitHub connected projects
          </p>
        </div>
        {repositories.length > 0 && (
          <CreateProjectModal
            repositories={repositories}
            organizationId={activeOrganization.id}
          />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              {repositories.length === 0
                ? "Connect a repository first to create projects."
                : "Create your first project to start organizing issues."}
            </p>
            {repositories.length === 0 ? (
              <Button asChild>
                <Link href="/settings/repositories">Connect Repository</Link>
              </Button>
            ) : (
              <CreateProjectModal
                repositories={repositories}
                organizationId={activeOrganization.id}
              />
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <Badge
                    variant={
                      project.status === "active" ? "default" : "secondary"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {project.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <GitBranch className="mr-2 h-4 w-4" />
                  {project.repositories.full_name}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/projects/${project.id}`}>View Project</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
