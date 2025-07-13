import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");

    if (!slug || slug.length < 2) {
      return NextResponse.json(
        { error: "Slug must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      console.error("Available env vars:", Object.keys(process.env).filter(key => key.includes('SUPABASE')).sort());
      return NextResponse.json(
        { error: "Server configuration error: Service role key missing" },
        { status: 500 }
      );
    }

    // Create a service role client to bypass RLS
    const cookieStore = await cookies();
    const serviceRoleClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-my-custom-header': 'daygent-api',
          },
        },
      }
    );

    // Check if slug exists using the database function
    const { data: available, error } = await serviceRoleClient.rpc(
      'check_workspace_slug_available',
      { p_slug: slug }
    );

    if (error) {
      console.error("Error checking slug availability:", error);
      return NextResponse.json(
        { error: "Failed to check slug availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({ available: available ?? false });
  } catch (error) {
    console.error("Error in slug check:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}