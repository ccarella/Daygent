export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        This is a protected route. You can only see this if you&apos;re
        authenticated.
      </p>
    </div>
  );
}
