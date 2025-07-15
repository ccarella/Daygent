import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WorkspaceSync } from "@/components/workspace-sync";

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WorkspaceSync />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}
