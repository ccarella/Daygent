import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Log environment check
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const serviceKeyPreview = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + "...";
    
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ 
        error: "Unauthorized",
        hasServiceKey,
        serviceKeyPreview 
      }, { status: 401 });
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
      }
    );

    // Test organization creation
    const testSlug = `test-org-${Date.now()}`;
    const { data: organization, error: orgError } = await serviceRoleClient
      .from("organizations")
      .insert({
        name: "Test Organization",
        slug: testSlug,
        description: "Test organization created for debugging",
        plan: "free",
      })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json({ 
        error: "Failed to create organization",
        details: orgError,
        hasServiceKey,
        serviceKeyPreview 
      }, { status: 500 });
    }

    // Add the user as owner
    const { error: memberError } = await serviceRoleClient
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      // Clean up
      await serviceRoleClient
        .from("organizations")
        .delete()
        .eq("id", organization.id);

      return NextResponse.json({ 
        error: "Failed to add user as owner",
        details: memberError,
        hasServiceKey,
        serviceKeyPreview 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      organization,
      hasServiceKey,
      serviceKeyPreview,
      userId: user.id 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: "Unexpected error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}