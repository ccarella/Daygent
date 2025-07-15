import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  console.log("[Supabase Health Check] Starting comprehensive health check...");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    clientTests: {},
    serverTests: {},
    errors: [],
  };

  // Test 1: Client-side Supabase initialization
  console.log("[Supabase Health Check] Testing client-side initialization...");
  try {
    const startTime = performance.now();
    const client = createClient();
    const clientInitTime = performance.now() - startTime;
    
    results.clientTests.initializationTime = `${clientInitTime.toFixed(2)}ms`;
    results.clientTests.initialized = !!client;
    results.clientTests.hasAuth = !!client.auth;
    results.clientTests.hasFrom = typeof client.from === "function";
    results.clientTests.hasStorage = !!client.storage;
    results.clientTests.hasRealtime = !!client.realtime;
    
    // Test auth methods exist
    results.clientTests.authMethods = {
      getUser: typeof client.auth.getUser === "function",
      getSession: typeof client.auth.getSession === "function",
      signOut: typeof client.auth.signOut === "function",
      onAuthStateChange: typeof client.auth.onAuthStateChange === "function",
    };
    
    console.log("[Supabase Health Check] Client initialized in", clientInitTime, "ms");
    
    // Test 2: Try to get session
    console.log("[Supabase Health Check] Testing getSession...");
    try {
      const sessionStart = performance.now();
      const { data: session, error } = await Promise.race([
        client.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("getSession timeout after 5s")), 5000)
        )
      ]) as Awaited<ReturnType<typeof client.auth.getSession>>;
      
      const sessionTime = performance.now() - sessionStart;
      results.clientTests.getSession = {
        time: `${sessionTime.toFixed(2)}ms`,
        hasSession: !!session?.session,
        sessionUser: session?.session?.user?.email || null,
        error: error?.message || null,
      };
      console.log("[Supabase Health Check] getSession completed in", sessionTime, "ms");
    } catch (error) {
      results.clientTests.getSession = {
        error: error instanceof Error ? error.message : String(error),
        timeout: true,
      };
      results.errors.push(`getSession: ${error.message}`);
    }
    
    // Test 3: Try to get user
    console.log("[Supabase Health Check] Testing getUser...");
    try {
      const userStart = performance.now();
      const { data: userData, error } = await Promise.race([
        client.auth.getUser(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("getUser timeout after 5s")), 5000)
        )
      ]) as Awaited<ReturnType<typeof client.auth.getSession>>;
      
      const userTime = performance.now() - userStart;
      results.clientTests.getUser = {
        time: `${userTime.toFixed(2)}ms`,
        hasUser: !!userData?.user,
        userId: userData?.user?.id || null,
        userEmail: userData?.user?.email || null,
        error: error?.message || null,
      };
      console.log("[Supabase Health Check] getUser completed in", userTime, "ms");
    } catch (error) {
      results.clientTests.getUser = {
        error: error instanceof Error ? error.message : String(error),
        timeout: true,
      };
      results.errors.push(`getUser: ${error.message}`);
    }
    
    // Test 4: Database connectivity
    console.log("[Supabase Health Check] Testing database connection...");
    try {
      const dbStart = performance.now();
      const { count, error } = await client
        .from("workspaces")
        .select("*", { count: "exact", head: true });
      
      const dbTime = performance.now() - dbStart;
      results.clientTests.database = {
        time: `${dbTime.toFixed(2)}ms`,
        connected: !error,
        workspaceCount: count || 0,
        error: error?.message || null,
      };
      console.log("[Supabase Health Check] Database query completed in", dbTime, "ms");
    } catch (error) {
      results.clientTests.database = {
        error: error instanceof Error ? error.message : String(error),
      };
      results.errors.push(`Database: ${error.message}`);
    }
    
  } catch (error) {
    console.error("[Supabase Health Check] Client initialization failed:", error);
    results.clientTests.initError = error.message;
    results.errors.push(`Client init: ${error.message}`);
  }
  
  // Test 5: Server-side Supabase
  console.log("[Supabase Health Check] Testing server-side client...");
  try {
    const serverClient = await createServerClient();
    results.serverTests.initialized = !!serverClient;
    results.serverTests.hasAuth = !!serverClient.auth;
    
    // Try server-side auth
    try {
      const { data: { user }, error } = await serverClient.auth.getUser();
      results.serverTests.auth = {
        hasUser: !!user,
        userId: user?.id || null,
        error: error?.message || null,
      };
    } catch (error) {
      results.serverTests.auth = { error: error instanceof Error ? error.message : String(error) };
      results.errors.push(`Server auth: ${error.message}`);
    }
  } catch (error) {
    results.serverTests.initError = error.message;
    results.errors.push(`Server init: ${error.message}`);
  }
  
  // Test 6: Check localStorage and cookies info
  results.browserInfo = {
    userAgent: "Server-side (not available)",
    cookieHeader: "Server-side (check browser)",
    recommendedChecks: [
      "Open browser DevTools → Application → Cookies",
      "Look for 'sb-[project-ref]-auth-token' cookie",
      "Check browser console for any errors",
      "Check Network tab for hanging requests",
    ],
  };
  
  // Summary
  results.summary = {
    healthy: results.errors.length === 0,
    totalErrors: results.errors.length,
    clientInitTime: results.clientTests.initializationTime,
    hasValidAuth: !!(results.clientTests.getUser?.hasUser || results.clientTests.getSession?.hasSession),
    recommendation: results.errors.length > 0 
      ? "Supabase client is not functioning properly. Check transpilation and bundle settings."
      : "Supabase client appears to be working correctly.",
  };
  
  console.log("[Supabase Health Check] Completed. Errors:", results.errors.length);
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    }
  });
}