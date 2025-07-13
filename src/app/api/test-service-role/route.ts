import { NextResponse } from "next/server";

export async function GET() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceKeyPreview = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 50) + "..."
    : "NOT SET";
  
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    environment: {
      hasServiceKey,
      serviceKeyPreview,
      hasSupabaseUrl,
      hasAnonKey,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
    },
    status: hasServiceKey && hasSupabaseUrl && hasAnonKey ? "ready" : "missing_config"
  });
}