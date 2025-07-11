import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your GitHub connected projects
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Projects list will appear here
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
