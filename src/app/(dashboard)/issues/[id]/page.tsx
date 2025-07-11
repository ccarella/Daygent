import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/issues">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to issues
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Issue #{id}</h1>
          <p className="text-muted-foreground">
            Issue details and AI-enhanced content
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Issue content will be loaded here. This page will display:
            </p>
            <ul className="text-muted-foreground">
              <li>Issue title and description</li>
              <li>AI-expanded implementation details</li>
              <li>Status and labels</li>
              <li>Comments and activity</li>
              <li>Related pull requests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
