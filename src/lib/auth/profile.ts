import { createClient } from "@/lib/supabase/server";

export async function ensureUserProfile(userId: string) {
  const supabase = await createClient();

  // Check if profile exists
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) {
    // Create profile from auth metadata
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from("users").insert({
        id: user.id,
        email: user.email!,
        name: user.user_metadata.full_name || user.user_metadata.name,
        avatar_url: user.user_metadata.avatar_url,
        github_id: user.user_metadata.user_name
          ? parseInt(user.user_metadata.sub)
          : null,
        github_username: user.user_metadata.user_name,
        google_id:
          user.app_metadata.provider === "google"
            ? user.user_metadata.sub
            : null,
      });

      if (error) {
        console.error("Failed to create user profile:", error);
        throw error;
      }
    }
  }

  return profile;
}
