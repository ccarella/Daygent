import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="flex justify-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLoadingInline() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
