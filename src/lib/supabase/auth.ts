import { createClient } from "./server";
import { Tables } from "@/lib/database.types";

export async function getServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    authUser: user,
    profile: profile as Tables<"users"> | null,
  };
}

export async function requireAuth() {
  const userData = await getServerUser();

  if (!userData) {
    throw new Error("Unauthorized");
  }

  return userData;
}

export function getRedirectURL(path: string = "/") {
  const baseURL =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");

  return new URL(path, baseURL).toString();
}

export async function createUserProfile(
  userId: string,
  metadata: Record<string, unknown>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .upsert({
      id: userId,
      email: metadata.email,
      name: metadata.full_name || metadata.name || null,
      avatar_url: metadata.avatar_url || null,
      github_id: metadata.provider_id
        ? parseInt(metadata.provider_id as string)
        : null,
      github_username:
        metadata.user_name || metadata.preferred_username || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
}

export async function getUserWorkspaces(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      workspace_id,
      workspace:workspaces (*)
    `,
    )
    .eq("user_id", userId);

  return { data, error };
}

export async function createDefaultWorkspace(userId: string) {
  const supabase = await createClient();

  // Check if default workspace exists
  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("name", "Default Workspace")
    .single();

  if (existingWorkspace) {
    // Add user to default workspace
    const { data, error } = await supabase
      .from("workspace_members")
      .upsert({
        user_id: userId,
        workspace_id: existingWorkspace.id,
        joined_at: new Date().toISOString(),
      })
      .select();

    return { data, error };
  }

  return { data: null, error: new Error("Default workspace not found") };
}
