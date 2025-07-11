import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InsertProject } from "@/lib/database.types";

interface CreateProjectRequest {
  organization_id: string;
  repository_id: string;
  name: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json();
    const { organization_id, repository_id, name, description } = body;

    if (!organization_id || !repository_id || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const { data: repository, error: repoError } = await supabase
      .from("repositories")
      .select("id, organization_id")
      .eq("id", repository_id)
      .eq("organization_id", organization_id)
      .single();

    if (repoError || !repository) {
      return NextResponse.json(
        {
          error: "Repository not found or doesn't belong to this organization",
        },
        { status: 404 },
      );
    }

    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("repository_id", repository_id)
      .eq("name", name)
      .single();

    if (existingProject) {
      return NextResponse.json(
        { error: "A project with this name already exists in the repository" },
        { status: 409 },
      );
    }

    const projectData: InsertProject = {
      repository_id,
      name,
      description: description || null,
      status: "active",
      created_by: user.id,
    };

    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating project:", createError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 },
      );
    }

    const { error: activityError } = await supabase.from("activities").insert({
      organization_id,
      user_id: user.id,
      action: "project.created",
      resource_type: "project",
      resource_id: project.id,
      metadata: {
        project_name: name,
        repository_id,
      },
    });

    if (activityError) {
      console.error("Error creating activity log:", activityError);
    }

    return NextResponse.json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organization_id = searchParams.get("organization_id");
    const repository_id = searchParams.get("repository_id");

    if (!organization_id) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    let query = supabase
      .from("projects")
      .select(
        `
        *,
        repositories (
          id,
          name,
          full_name
        )
      `,
      )
      .eq("repositories.organization_id", organization_id)
      .order("created_at", { ascending: false });

    if (repository_id) {
      query = query.eq("repository_id", repository_id);
    }

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 },
      );
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
