import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get workspace by slug
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) {
    notFound();
  }

  // Verify user is a member of the workspace
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    notFound();
  }

  return <>{children}</>;
}