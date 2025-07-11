"use client";

import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("code");

  const getErrorMessage = () => {
    switch (errorCode) {
      case "no_organization":
        return {
          title: "Organization Setup Required",
          description:
            "There was an issue creating your organization. This is usually temporary.",
          action: "Try Refreshing",
        };
      default:
        return {
          title: "Authentication Error",
          description:
            "Something went wrong during authentication. Please try again.",
          action: "Back to Login",
        };
    }
  };

  const errorInfo = getErrorMessage();

  const handleRefresh = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{errorInfo.title}</CardTitle>
          <CardDescription className="mt-2">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Error code:{" "}
              <code className="font-mono">{errorCode || "unknown"}</code>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {errorCode === "no_organization" ? (
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {errorInfo.action}
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link href="/login">{errorInfo.action}</Link>
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
