import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  console.log("[Supabase Client] Creating browser client...");
  const startTime = performance.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("[Supabase Client] Environment check:", {
    hasUrl: !!supabaseUrl,
    urlLength: supabaseUrl?.length || 0,
    urlPrefix: supabaseUrl?.substring(0, 30) || "Not set",
    hasKey: !!supabaseKey,
    keyLength: supabaseKey?.length || 0,
    keyPrefix: supabaseKey?.substring(0, 10) || "Not set",
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Client] Missing environment variables!");
    console.error(
      "[Supabase Client] NEXT_PUBLIC_SUPABASE_URL:",
      supabaseUrl ? "Set" : "Missing",
    );
    console.error(
      "[Supabase Client] NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseKey ? "Set" : "Missing",
    );
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    );
  }

  console.log("[Supabase Client] Creating client with options:", {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  });

  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const elapsed = performance.now() - startTime;
  console.log(
    `[Supabase Client] Browser client created in ${elapsed.toFixed(2)}ms`,
  );

  return client;
}
