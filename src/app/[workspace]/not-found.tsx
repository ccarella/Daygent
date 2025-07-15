import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Workspace Not Found</h1>
      <p className="text-gray-600 mb-8">
        The workspace you&apos;re looking for doesn&apos;t exist or you
        don&apos;t have access.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
