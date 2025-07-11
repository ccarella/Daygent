import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ActivityPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            Track your development activity and progress
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Activity feed will appear here
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
