import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function IssuesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">
            View and manage your project issues
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Issues list will appear here</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
