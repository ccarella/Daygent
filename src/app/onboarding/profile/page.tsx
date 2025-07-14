import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSetupForm } from "@/components/onboarding/ProfileSetupForm";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if profile already exists
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // If profile doesn't exist, create it with basic info
  if (profileError && profileError.code === "PGRST116") {
    console.log("Profile doesn't exist, creating one for user:", user.id);
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || user.user_metadata?.full_name || "",
      avatar_url: user.user_metadata?.avatar_url || "",
    });

    if (insertError) {
      console.error("Error creating profile:", insertError);
    }
  }

  if (profile?.name && profile?.avatar_url) {
    // Profile complete, move to workspace creation
    redirect("/onboarding/workspace");
  }

  // Re-fetch profile after potential creation
  const { data: currentProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Complete Your Profile</h1>
        <p className="text-gray-600 mt-2">
          Let&apos;s personalize your Daygent experience
        </p>
      </div>

      <ProfileSetupForm
        userId={user.id}
        defaultEmail={user.email!}
        defaultName={currentProfile?.name || ""}
        defaultAvatar={currentProfile?.avatar_url || ""}
      />
    </div>
  );
}
