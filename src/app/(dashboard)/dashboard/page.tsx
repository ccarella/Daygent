export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your project dashboard
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Recent Issues</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No recent issues to display
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Projects</h3>
          <p className="mt-2 text-sm text-muted-foreground">No projects yet</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Activity</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No recent activity
          </p>
        </div>
      </div>
    </div>
  );
}
