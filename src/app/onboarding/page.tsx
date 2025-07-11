"use client";

import { Button } from "@/components/ui/button";
import { Github, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  useEffect(() => {
    if (!activeOrganization) {
      router.push("/organizations");
    }
  }, [activeOrganization, router]);
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Welcome to Daygent</h1>
          <p className="text-lg text-muted-foreground">
            Let&apos;s get you set up with AI-powered project management for
            Claude Code
          </p>
        </div>

        <div className="space-y-8">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">1. GitHub Connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your GitHub account is successfully connected
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-muted p-2">
                <Github className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold">
                    2. Connect Your First Repository
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import issues from a GitHub repository to start using
                    AI-enhanced development
                  </p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => router.push("/repositories")}
                >
                  Browse Repositories
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to explore first?
            </p>
            <Button variant="outline" asChild>
              <Link href="/repositories">Skip for now</Link>
            </Button>
          </div>
        </div>

        <div className="text-center space-y-4 pt-8">
          <h2 className="text-lg font-semibold">What happens next?</h2>
          <div className="grid gap-4 text-sm text-muted-foreground max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="font-medium">1.</span>
              <span>
                We&apos;ll import your GitHub issues and enhance them with
                AI-generated implementation details
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium">2.</span>
              <span>
                You can review and refine the AI suggestions to match your
                project needs
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium">3.</span>
              <span>
                Start developing with Claude Code using optimized issue
                descriptions
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
