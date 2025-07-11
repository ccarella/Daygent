"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(50, "Organization name must be less than 50 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30, "Slug must be less than 30 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens only"
    ),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateOrganizationFormProps {
  userId: string;
}

export function CreateOrganizationForm({
  userId,
}: CreateOrganizationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const supabase = createClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
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
        const { data, error } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.error("Error checking slug:", error);
          setSlugAvailable(null);
        } else {
          setSlugAvailable(!data);
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
  }, [form.watch("slug"), supabase]);

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
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          subscription_status: "trial",
          trial_ends_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          seats_used: 1,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: "owner",
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Log activity
      await supabase.from("activities").insert({
        organization_id: org.id,
        user_id: userId,
        type: "member_joined",
        description: `Organization created`,
      });

      toast.success("Organization created!", {
        description: "Your workspace is ready. Let's connect your first repository.",
      });

      // Redirect to repository connection
      router.push("/settings/repositories");
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("Error creating organization", {
        description: "Something went wrong. Please try again.",
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
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Corp"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The display name for your organization
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
                Unique identifier for your organization URL
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief description of your organization"
                  className="resize-none"
                  rows={3}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Help others understand what your organization is about
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading || slugAvailable === false}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Organization
        </Button>
      </form>
    </Form>
  );
}