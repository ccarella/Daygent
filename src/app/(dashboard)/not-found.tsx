import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground">
            This page doesn&apos;t exist. Check the URL or navigate back to a
            valid page.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-4">
          <Button asChild>
            <Link href="/issues">Go to Issues</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">View Projects</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
