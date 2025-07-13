"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30, "Slug must be less than 30 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens only"
    ),
});

type FormData = z.infer<typeof formSchema>;

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
  };

  // Auto-generate slug from name
  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === "name" && value.name) {
        const generatedSlug = generateSlug(value.name);
        if (generatedSlug !== form.getValues("slug")) {
          form.setValue("slug", generatedSlug);
        }
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check slug availability
  useEffect(() => {
    const checkSlug = async () => {
      const slug = form.watch("slug");
      if (!slug || slug.length < 2) {
        setSlugAvailable(null);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const response = await fetch(`/api/workspaces/check-slug?slug=${encodeURIComponent(slug)}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("User not authenticated");
            setSlugAvailable(null);
          } else {
            console.error("Error checking slug availability");
            setSlugAvailable(null);
          }
        } else {
          const data = await response.json();
          setSlugAvailable(data.available);
        }
      } catch (error) {
        console.error("Error checking slug:", error);
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timeoutId = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch("slug")]);

  const onSubmit = async (data: FormData) => {
    if (slugAvailable === false) {
      form.setError("slug", {
        type: "manual",
        message: "This slug is already taken",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use API endpoint that has service role access
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create workspace");
      }

      toast.success("Workspace created!", {
        description: "Your workspace is ready. Let's connect your first repository.",
      });

      // Redirect to repository connection
      router.push("/settings/repositories");
    } catch (error) {
      console.error("Error creating workspace:", error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error("Error creating workspace", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Corp"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The display name for your workspace
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="acme-corp"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                {isCheckingSlug && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isCheckingSlug && slugAvailable === true && field.value && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
                {!isCheckingSlug && slugAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-destructive" />
                  </div>
                )}
              </div>
              <FormDescription>
                Unique identifier for your workspace URL
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || slugAvailable === false}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Workspace
        </Button>
      </form>
    </Form>
  );
}