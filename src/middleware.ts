import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback"];
const ONBOARDING_PATHS = ["/onboarding/profile", "/onboarding/workspace", "/onboarding/welcome"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Update the session and get the response
  const { response, user } = await updateSession(request);

  if (!user) {
    // Not authenticated - redirect to login
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow onboarding paths for authenticated users
  if (ONBOARDING_PATHS.some(path => pathname.startsWith(path))) {
    return response;
  }

  // For dashboard routes, check workspace membership
  if (pathname.startsWith("/dashboard") || pathname.match(/^\/[^\/]+\/(issues|repositories|settings)/)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // We don't need to set cookies here
          },
        },
      },
    );

    const { data: workspaces } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!workspaces || workspaces.length === 0) {
      // No workspace - redirect to workspace creation
      return NextResponse.redirect(new URL("/onboarding/workspace", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};