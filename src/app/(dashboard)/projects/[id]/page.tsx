import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Github, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      repositories (
        id,
        name,
        full_name,
        private,
        default_branch
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: issues } = await supabase
    .from("issues")
    .select("id, title, status, priority, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const openIssuesCount =
    issues?.filter((issue) => issue.status === "open").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to projects
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              {project.description || "No description provided"}
            </p>
          </div>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Project Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repository</span>
                <span className="font-medium">
                  {project.repositories.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{project.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issues</span>
                <span className="font-medium">{openIssuesCount} open</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                asChild
              >
                <a
                  href={`https://github.com/${project.repositories.full_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                disabled
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Sync Issues (Coming Soon)
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Recent Issues</h3>
          {issues && issues.length > 0 ? (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {issue.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issue.priority}
                      </Badge>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/issues/${issue.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No issues found. Create your first issue to start tracking work.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
