import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/auth/error",
];
const ONBOARDING_PATHS = [
  "/onboarding/profile",
  "/onboarding/workspace",
  "/onboarding/welcome",
];
const API_PATHS = ["/api"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow API paths
  if (API_PATHS.some((path) => pathname.startsWith(path))) {
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
  if (ONBOARDING_PATHS.some((path) => pathname.startsWith(path))) {
    return response;
  }

  // Create Supabase client for database queries
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

  // Get user's workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, slug, name")
    .in(
      "id",
      await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .then(({ data }) => data?.map((m) => m.workspace_id) || []),
    );

  if (!workspaces || workspaces.length === 0) {
    // No workspace - redirect to workspace creation
    return NextResponse.redirect(new URL("/onboarding/workspace", request.url));
  }

  // Extract workspace slug from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const workspaceSlug = pathSegments[0];

  // Check if the path has a workspace slug
  const hasWorkspaceSlug = workspaces.some((w) => w.slug === workspaceSlug);

  // If the path doesn't start with a valid workspace slug, redirect to the first workspace
  if (!hasWorkspaceSlug) {
    const firstWorkspace = workspaces[0];
    if (firstWorkspace) {
      // Redirect to workspace-scoped version of the requested page
      const newPath = `/${firstWorkspace.slug}${pathname}`;
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
