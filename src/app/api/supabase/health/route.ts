import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Test connection with a simple query that should always work
    // Even with no tables, we can select from the database
    const { error } = await supabase
      .from("test_connection")
      .select("*")
      .limit(0);

    // If we get here without throwing, the connection is working
    // Even if the table doesn't exist, we connected successfully
    const isHealthy = !error || error.code === "42P01"; // 42P01 = table does not exist

    if (isHealthy) {
      return NextResponse.json({
        status: "healthy",
        message: "Supabase connection successful",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw error;
    }
  } catch (error) {
    console.error("Supabase health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        message: "Supabase connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
