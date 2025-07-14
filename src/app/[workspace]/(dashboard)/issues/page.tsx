import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { IssueList } from "./components/IssueList";
import { IssueFilters } from "./components/IssueFilters";
import { IssueSorting } from "./components/IssueSorting";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

interface IssuesPageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    project?: string;
    assignee?: string;
    enhanced?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

const ITEMS_PER_PAGE = 25;

export default async function IssuesPage({ params, searchParams }: IssuesPageProps) {
  const { workspace: workspaceSlug } = await params;
  const searchParamsResolved = await searchParams;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Please sign in to view issues</p>
      </div>
    );
  }

  // Get workspace by slug
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  // Build query
  let query = supabase
    .from("issues")
    .select(
      `
      *,
      project:projects(id, name),
      repository:repositories(id, name, full_name),
      assigned_user:users!issues_assigned_to_fkey(id, name, avatar_url),
      created_user:users!issues_created_by_fkey(id, name, avatar_url)
    `,
      { count: "exact" }
    )
    .eq("workspace_id", workspace.id);

  // Apply filters
  if (searchParamsResolved.status && searchParamsResolved.status !== "all") {
    query = query.eq("status", searchParamsResolved.status);
  }

  if (searchParamsResolved.priority && searchParamsResolved.priority !== "all") {
    query = query.eq("priority", searchParamsResolved.priority);
  }

  if (searchParamsResolved.project) {
    query = query.eq("project_id", searchParamsResolved.project);
  }

  if (searchParamsResolved.assignee) {
    if (searchParamsResolved.assignee === "me") {
      query = query.eq("assigned_to", user.id);
    } else if (searchParamsResolved.assignee === "unassigned") {
      query = query.is("assigned_to", null);
    }
  }

  if (searchParamsResolved.enhanced === "true") {
    query = query.not("expanded_description", "is", null);
  }

  // Apply sorting
  const sortField = searchParamsResolved.sort || "updated_at";
  const sortOrder = searchParamsResolved.order === "asc" ? true : false;
  query = query.order(sortField, { ascending: sortOrder });

  // Apply pagination
  const page = parseInt(searchParamsResolved.page || "1", 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: issues, count, error } = await query;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-8 text-center">
        <p className="text-destructive">
          Error loading issues: {error.message}
        </p>
      </div>
    );
  }

  // Get projects for filter dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .order("name");

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">
            View and manage your project issues
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/issues/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Issue
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <IssueFilters projects={projects || []} />
        <IssueSorting />
      </div>

      <Suspense fallback={<div>Loading issues...</div>}>
        <IssueList
          issues={issues || []}
          totalCount={count || 0}
          currentPage={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
