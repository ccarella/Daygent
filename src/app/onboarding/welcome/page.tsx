"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Code, GitBranch, Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceStore } from "@/stores/workspace.store";

const slides = [
  {
    title: "Welcome to Daygent",
    description:
      "Daygent is an app to manage Software Engineering Agents in your product development process",
    icon: Code,
  },
  {
    title: "AI-Powered Development",
    description:
      "Create issues that are optimized for Claude Code and other AI assistants to implement",
    icon: Zap,
  },
  {
    title: "GitHub Integration",
    description:
      "Seamlessly sync issues between Daygent and GitHub for complete visibility",
    icon: GitBranch,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const { currentWorkspace, workspaces, loadWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    // Ensure we have the latest workspace data
    const loadData = async () => {
      setIsLoadingWorkspace(true);
      await loadWorkspaces();
      setIsLoadingWorkspace(false);
    };
    loadData();
  }, [loadWorkspaces]);

  const handleNext = async () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Connect with GitHub
      setIsConnecting(true);

      let workspace = currentWorkspace;

      try {
        // Get current workspace if not already loaded
        if (!workspace) {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // First check if we have workspaces in the store
            if (workspaces && workspaces.length > 0) {
              workspace = workspaces[0];
            } else {
              // Fallback: Query for workspaces where user is a member
              const { data: memberData } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              if (memberData?.workspace_id) {
                // Fetch the workspace directly
                const { data: workspaceData } = await supabase
                  .from("workspaces")
                  .select("*")
                  .eq("id", memberData.workspace_id)
                  .single();

                if (workspaceData) {
                  workspace = workspaceData;
                }
              }
            }
          }
        }

        if (!workspace) {
          // If no workspace found, redirect to workspace creation
          router.push("/onboarding/workspace");
          return;
        }

        // Initiate GitHub App installation
        const response = await fetch("/api/github/install", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          console.error("GitHub install API error:", errorData);
          throw new Error(
            errorData.error || "Failed to initiate GitHub connection",
          );
        }

        const { install_url, error } = await response.json();

        if (error) {
          throw new Error(error);
        }

        if (!install_url) {
          throw new Error("No installation URL received");
        }

        // Redirect to GitHub App installation page
        window.location.href = install_url;
      } catch (error) {
        console.error("Error connecting GitHub:", error);
        // On error, redirect to the dashboard
        // Try to use the workspace we found, or current workspace, or fallback to home
        const redirectWorkspace = workspace || currentWorkspace;
        if (redirectWorkspace) {
          router.push(`/${redirectWorkspace.slug}/issues`);
        } else {
          router.push("/");
        }
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="space-y-8">
      <Card className="p-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
            <Icon className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{slide.title}</h1>
          <p className="text-gray-600 max-w-md mx-auto">{slide.description}</p>
        </div>

        <div className="flex items-center justify-center space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentSlide ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </Card>

      <Button
        onClick={handleNext}
        className="w-full"
        size="lg"
        disabled={
          isConnecting ||
          (currentSlide === slides.length - 1 &&
            (isLoadingWorkspace || (!currentWorkspace && !workspaces?.length)))
        }
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : currentSlide < slides.length - 1 ? (
          <>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        ) : currentSlide === slides.length - 1 &&
          (isLoadingWorkspace || (!currentWorkspace && !workspaces?.length)) ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading workspace...
          </>
        ) : (
          "Connect with GitHub"
        )}
      </Button>
    </div>
  );
}
