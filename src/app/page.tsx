import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GitBranch, Bot, Users, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Daygent
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Manage Software Engineering Agents in your product development
              process
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for AI-Driven Development
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Seamlessly integrate AI agents into your development workflow
            </p>
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    AI-Powered Issue Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Transform simple ideas into detailed, actionable issues
                    optimized for AI development agents
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">GitHub Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Sync seamlessly with your GitHub repositories and manage
                    pull requests with AI assistance
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    Real-time Collaboration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Work together with your team and AI agents in real-time with
                    instant updates and notifications
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    Smart Project Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Monitor AI agent performance, track token usage, and gain
                    insights into your development process
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to supercharge your development?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join developers who are building faster with AI agents
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
