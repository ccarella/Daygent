import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceCreationForm } from "@/components/onboarding/WorkspaceCreationForm";

export default async function WorkspaceCreationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user already has workspace
  const { data: workspaces } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (workspaces && workspaces.length > 0) {
    redirect("/onboarding/welcome");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create Your Workspace</h1>
        <p className="text-gray-600 mt-2">
          A workspace is where you&apos;ll manage your projects and collaborate
        </p>
      </div>
      
      <WorkspaceCreationForm />
    </div>
  );
}