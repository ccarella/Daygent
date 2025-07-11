export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-80 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
