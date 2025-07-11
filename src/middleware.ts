import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Route configuration for better maintainability
const routeConfig = {
  // Routes that don't require authentication
  publicRoutes: [
    "/",
    "/login",
    "/api/auth/callback",
    "/design-test",
    "/components",
  ],

  // API routes that don't require authentication (webhooks)
  publicApiRoutes: ["/api/webhooks"],

  // Routes that authenticated users shouldn't access
  authRestrictedRoutes: ["/login"],
};

// Helper function to check if a path matches any route pattern
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    // Exact match
    if (pathname === route) return true;

    // Prefix match for paths ending with /*
    if (route.endsWith("/*")) {
      const prefix = route.slice(0, -2);
      return pathname.startsWith(prefix);
    }

    // Prefix match for paths like /api/webhooks
    if (pathname.startsWith(route + "/")) return true;

    return false;
  });
}

export async function middleware(request: NextRequest) {
  // Update the session and get the response
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // Check if the current route is public
  const isPublicRoute = matchesRoute(pathname, routeConfig.publicRoutes);
  const isPublicApiRoute = matchesRoute(pathname, routeConfig.publicApiRoutes);
  const isAuthRestrictedRoute = matchesRoute(
    pathname,
    routeConfig.authRestrictedRoutes,
  );

  // Redirect unauthenticated users to login (except for public routes)
  if (!user && !isPublicRoute && !isPublicApiRoute) {
    const redirectUrl = new URL("/login", request.url);
    // Preserve the intended destination
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth-restricted routes
  if (user && isAuthRestrictedRoute) {
    // Check if there's a 'next' parameter to redirect to
    const next = request.nextUrl.searchParams.get("next") || "/issues";
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Check if authenticated user has an organization (skip for public/error routes)
  if (user && !isPublicRoute && !pathname.startsWith("/auth/error")) {
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

    try {
      const { data: orgs, error } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        console.error(
          "[Middleware] Error checking organization membership:",
          error,
        );
      } else if (!orgs || orgs.length === 0) {
        console.error(
          "[Middleware] User has no organization - this should not happen",
        );
        // The database trigger should prevent this, but if it fails, handle gracefully
        return NextResponse.redirect(
          new URL("/auth/error?code=no_organization", request.url),
        );
      }
    } catch (error) {
      console.error("[Middleware] Failed to check organization:", error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
