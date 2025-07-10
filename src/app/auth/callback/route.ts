import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const githubUsername =
        data.user.user_metadata?.user_name ||
        data.user.user_metadata?.preferred_username;
      const avatarUrl = data.user.user_metadata?.avatar_url;

      const { error: upsertError } = await supabase
        .from("users")
        .upsert({
          id: data.user.id,
          email: data.user.email,
          github_id: data.user.user_metadata?.provider_id,
          github_username: githubUsername,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) {
        console.error("Error upserting user data:", upsertError);
      }

      const defaultOrgResult = await supabase
        .from("organizations")
        .select("id")
        .eq("name", "Default Organization")
        .single();

      if (defaultOrgResult.data) {
        await supabase
          .from("organization_members")
          .upsert({
            user_id: data.user.id,
            organization_id: defaultOrgResult.data.id,
            role: "member",
          })
          .select();
      }
    }

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL(`/login?error=auth_callback_error`, requestUrl.origin),
  );
}
