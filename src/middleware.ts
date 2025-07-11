import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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
    const next = request.nextUrl.searchParams.get("next") || "/dashboard";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
