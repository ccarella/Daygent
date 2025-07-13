import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/onboarding/CreateWorkspaceForm";

export const metadata = {
  title: "Create Your Workspace - Daygent",
  description: "Set up your workspace to start managing projects with Daygent",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user already has a workspace
  const { data: workspaces } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (workspaces && workspaces.length > 0) {
    redirect("/issues");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Daygent
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Let&apos;s set up your workspace to start managing projects
          </p>
        </div>

        <div className="mt-12">
          <div className="rounded-lg border bg-card p-8">
            <h2 className="text-xl font-semibold mb-6">
              Create Your Workspace
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Workspaces are where you can manage repositories
              and collaborate with your team. You can create multiple
              workspaces or join existing ones.
            </p>
            <CreateWorkspaceForm />
          </div>
        </div>
      </div>
    </div>
  );
}
