import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  console.log("[Supabase Server] Creating server client...");
  const startTime = performance.now();

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  console.log("[Supabase Server] Cookie info:", {
    cookieCount: allCookies.length,
    hasAuthCookies: allCookies.some((c) => c.name.includes("sb-")),
    cookieNames: allCookies.map((c) => c.name).filter((n) => n.includes("sb-")),
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("[Supabase Server] Environment check:", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseKey,
  });

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            console.log(
              `[Supabase Server] Setting ${cookiesToSet.length} cookies`,
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.log(
              "[Supabase Server] Cookie setAll called from Server Component (expected)",
            );
          }
        },
      },
    },
  );

  const elapsed = performance.now() - startTime;
  console.log(
    `[Supabase Server] Server client created in ${elapsed.toFixed(2)}ms`,
  );

  return client;
}

export async function createServiceRoleClient() {
  console.log("[Supabase Server] Creating service role client...");
  const startTime = performance.now();

  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[Supabase Server] Service role environment check:", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceRoleKey,
    serviceKeyLength: serviceRoleKey?.length || 0,
  });

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            console.log(
              `[Supabase Server] Service role setting ${cookiesToSet.length} cookies`,
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.log(
              "[Supabase Server] Service role cookie setAll called from Server Component (expected)",
            );
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const elapsed = performance.now() - startTime;
  console.log(
    `[Supabase Server] Service role client created in ${elapsed.toFixed(2)}ms`,
  );

  return client;
}
