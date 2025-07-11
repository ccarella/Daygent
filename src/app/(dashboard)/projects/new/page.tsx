import { Button } from "@/components/ui/button";
import { ArrowLeft, Github } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
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

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Connect a GitHub Repository</h1>
          <p className="text-muted-foreground">
            Import issues from your GitHub repository to start using AI-enhanced
            development
          </p>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Repository URL</label>
            <input
              type="text"
              placeholder="https://github.com/owner/repository"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL of your GitHub repository
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <input
              type="text"
              placeholder="My Project"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Give your project a friendly name
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-muted bg-muted/10 p-4">
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Github className="h-4 w-4" />
            GitHub Integration
          </h3>
          <p className="text-sm text-muted-foreground">
            Daygent will request access to read your repository&apos;s issues
            and pull requests. You can revoke access at any time from your
            GitHub settings.
          </p>
        </div>

        <div className="flex gap-3">
          <Button>Connect Repository</Button>
          <Button variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
