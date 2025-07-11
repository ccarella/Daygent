"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  trial_ends_at: string;
  seats_used: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  github_username: string | null;
}

export default function DebugOrgPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const checkUserAndOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError("Not authenticated");
        return;
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        setError(`Failed to fetch user profile: ${profileError.message}`);
        return;
      }

      setUser(userProfile);

      // Get user's organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select(
          `
          id,
          name,
          slug,
          subscription_status,
          trial_ends_at,
          seats_used,
          created_at,
          organization_members!inner(role)
        `,
        )
        .eq("organization_members.user_id", authUser.id);

      if (orgsError) {
        setError(`Failed to fetch organizations: ${orgsError.message}`);
        return;
      }

      setOrganizations(orgs || []);
    } catch (err) {
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkUserAndOrganizations();
  }, [checkUserAndOrganizations]);

  const createOrganization = async () => {
    if (!user) return;

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      // Call the API route to create organization
      const response = await fetch("/api/debug/create-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create organization");
        return;
      }

      setSuccess(data.message);

      // Refresh organizations list
      await checkUserAndOrganizations();
    } catch (err) {
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Organization Debug Tool</CardTitle>
          <CardDescription>
            Check and manage organizations for the current user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          {user && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Current User</h3>
              <div className="text-sm space-y-1">
                <p>
                  <strong>ID:</strong> {user.id}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Name:</strong> {user.name || "Not set"}
                </p>
                <p>
                  <strong>GitHub Username:</strong>{" "}
                  {user.github_username || "Not set"}
                </p>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Organizations */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Organizations</h3>
            {organizations.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No organizations found for this user.
                </p>
                <Button
                  onClick={createOrganization}
                  disabled={creating}
                  className="w-full sm:w-auto"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Default Organization
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {organizations.map((org) => (
                  <Card key={org.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{org.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Slug</p>
                          <p className="font-medium">{org.slug}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">
                            {org.subscription_status}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={checkUserAndOrganizations} variant="outline">
              Refresh
            </Button>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
