"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/repositories");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Redirecting to repositories...</p>
      </div>
    </div>
  );
}
