import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSetupForm } from "@/components/onboarding/ProfileSetupForm";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if profile already exists
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.name && profile?.avatar_url) {
    // Profile complete, move to workspace creation
    redirect("/onboarding/workspace");
  }

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
        defaultName={profile?.name}
        defaultAvatar={profile?.avatar_url}
      />
    </div>
  );
}