"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseTestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      console.log("[Supabase Test Page] Starting client-side tests...");
      
      const testResults: any = {
        timestamp: new Date().toISOString(),
        browser: {
          userAgent: navigator.userAgent,
          cookiesEnabled: navigator.cookieEnabled,
        },
        localStorage: {},
        cookies: {},
        supabaseClient: {},
        errors: [],
      };

      // Check localStorage
      try {
        const keys = Object.keys(localStorage);
        const supabaseKeys = keys.filter(k => k.includes('sb-') || k.includes('supabase'));
        testResults.localStorage.totalKeys = keys.length;
        testResults.localStorage.supabaseKeys = supabaseKeys;
        testResults.localStorage.authToken = null;
        
        // Look for auth token
        for (const key of supabaseKeys) {
          if (key.includes('auth-token')) {
            try {
              const value = localStorage.getItem(key);
              const parsed = JSON.parse(value || '{}');
              testResults.localStorage.authToken = {
                key,
                hasUser: !!parsed.user,
                userId: parsed.user?.id,
                expiresAt: parsed.expires_at,
              };
            } catch (e) {
              testResults.localStorage.authToken = { key, parseError: true };
            }
          }
        }
      } catch (error: any) {
        testResults.errors.push(`localStorage: ${error.message}`);
      }

      // Check cookies
      try {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const supabaseCookies = cookies.filter(c => c.includes('sb-') || c.includes('supabase'));
        testResults.cookies.total = cookies.length;
        testResults.cookies.supabaseCookies = supabaseCookies.map(c => c.split('=')[0]);
      } catch (error: any) {
        testResults.errors.push(`cookies: ${error.message}`);
      }

      // Test Supabase client
      try {
        console.log("[Supabase Test Page] Creating client...");
        const startTime = performance.now();
        const supabase = createClient();
        const initTime = performance.now() - startTime;
        
        testResults.supabaseClient.initTime = `${initTime.toFixed(2)}ms`;
        testResults.supabaseClient.exists = !!supabase;
        testResults.supabaseClient.hasAuth = !!supabase.auth;
        
        // Test getSession
        console.log("[Supabase Test Page] Testing getSession...");
        try {
          const sessionStart = performance.now();
          const { data: { session }, error } = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout after 5s")), 5000)
            )
          ]) as any;
          
          const sessionTime = performance.now() - sessionStart;
          testResults.supabaseClient.getSession = {
            time: `${sessionTime.toFixed(2)}ms`,
            hasSession: !!session,
            user: session?.user?.email,
            error: error?.message,
          };
        } catch (error: any) {
          testResults.supabaseClient.getSession = {
            error: error.message,
            timeout: true,
          };
          testResults.errors.push(`getSession: ${error.message}`);
        }

        // Test getUser
        console.log("[Supabase Test Page] Testing getUser...");
        try {
          const userStart = performance.now();
          const { data: { user }, error } = await Promise.race([
            supabase.auth.getUser(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Timeout after 5s")), 5000)
            )
          ]) as any;
          
          const userTime = performance.now() - userStart;
          testResults.supabaseClient.getUser = {
            time: `${userTime.toFixed(2)}ms`,
            hasUser: !!user,
            userId: user?.id,
            email: user?.email,
            error: error?.message,
          };
        } catch (error: any) {
          testResults.supabaseClient.getUser = {
            error: error.message,
            timeout: true,
          };
          testResults.errors.push(`getUser: ${error.message}`);
        }

        // Test auth state listener
        console.log("[Supabase Test Page] Testing auth state listener...");
        try {
          let listenerCalled = false;
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            listenerCalled = true;
            console.log("[Supabase Test Page] Auth state changed:", event);
          });
          
          // Give it a moment to potentially fire
          await new Promise(resolve => setTimeout(resolve, 100));
          
          testResults.supabaseClient.authListener = {
            subscribed: !!subscription,
            called: listenerCalled,
          };
          
          subscription?.unsubscribe();
        } catch (error: any) {
          testResults.supabaseClient.authListener = { error: error.message };
          testResults.errors.push(`authListener: ${error.message}`);
        }

      } catch (error: any) {
        testResults.supabaseClient.initError = error.message;
        testResults.errors.push(`Client init: ${error.message}`);
      }

      // Summary
      testResults.summary = {
        healthy: testResults.errors.length === 0,
        totalErrors: testResults.errors.length,
        hasAuthToken: !!testResults.localStorage.authToken?.hasUser,
        hasAuthCookie: testResults.cookies.supabaseCookies?.length > 0,
        clientWorks: testResults.supabaseClient.initTime && parseFloat(testResults.supabaseClient.initTime) > 10,
      };

      console.log("[Supabase Test Page] Tests completed:", testResults);
      setResults(testResults);
      setLoading(false);
    }

    runTests();
  }, []);

  // Also fetch server-side health check
  useEffect(() => {
    fetch('/api/test/supabase-health')
      .then(res => res.json())
      .then(data => {
        setResults(prev => ({ ...prev, serverSide: data }));
      })
      .catch(error => {
        setResults(prev => ({ ...prev, serverSideError: error.message }));
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase Health Check</h1>
        <p>Running tests...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Health Check</h1>
      
      <div className={`p-4 rounded mb-4 ${results.summary?.healthy ? 'bg-green-100' : 'bg-red-100'}`}>
        <h2 className="font-bold">Summary</h2>
        <p>Status: {results.summary?.healthy ? '✅ Healthy' : '❌ Issues Found'}</p>
        <p>Errors: {results.summary?.totalErrors || 0}</p>
        <p>Has Auth Token: {results.summary?.hasAuthToken ? '✅' : '❌'}</p>
        <p>Has Auth Cookie: {results.summary?.hasAuthCookie ? '✅' : '❌'}</p>
        <p>Client Works: {results.summary?.clientWorks ? '✅' : '❌'}</p>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Key Metrics</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Client Init Time:</strong> {results.supabaseClient?.initTime} 
            {results.supabaseClient?.initTime && parseFloat(results.supabaseClient.initTime) < 10 && 
              <span className="text-red-600 ml-2">⚠️ Too fast! Not actually initializing</span>
            }
          </p>
          <p><strong>GetSession Time:</strong> {results.supabaseClient?.getSession?.time}</p>
          <p><strong>GetUser Time:</strong> {results.supabaseClient?.getUser?.time}</p>
        </div>
      </div>

      <details className="mb-4">
        <summary className="cursor-pointer font-bold">Full Client-Side Results</summary>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(results, null, 2)}
        </pre>
      </details>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">How to Debug</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Open DevTools (F12) and check the Console tab for errors</li>
          <li>Go to Application → Cookies and look for <code>sb-*-auth-token</code></li>
          <li>Go to Application → Local Storage and check for Supabase keys</li>
          <li>Check Network tab for any hanging requests to Supabase</li>
          <li>If init time is under 10ms, Supabase is not actually initializing</li>
        </ol>
      </div>
    </div>
  );
}