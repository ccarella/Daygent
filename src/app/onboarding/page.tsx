import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "@/components/onboarding/CreateOrganizationForm";

export const metadata = {
  title: "Create Your Organization - Daygent",
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

  // Check if user already has an organization
  const { data: organizations } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (organizations && organizations.length > 0) {
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
              Create Your Organization
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Organizations are workspaces where you can manage repositories,
              projects, and collaborate with your team. You can create multiple
              organizations or join existing ones.
            </p>
            <CreateOrganizationForm />
          </div>
        </div>
      </div>
    </div>
  );
}
