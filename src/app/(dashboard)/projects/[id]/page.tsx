import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
        <div>
          <h1 className="text-3xl font-bold">Project Details</h1>
          <p className="text-muted-foreground">
            Manage your GitHub connected project
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Project Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repository</span>
                <span className="font-medium">owner/repo-{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issues</span>
                <span className="font-medium">0 open</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Sync Issues
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Recent Issues</h3>
          <p className="text-muted-foreground text-sm">
            No issues found. Issues from this project will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
