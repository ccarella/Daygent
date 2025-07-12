"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  repository_id: z.string().min(1, "Repository is required"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string | null;
}

interface CreateProjectModalProps {
  repositories: Repository[];
  organizationId: string;
  trigger?: React.ReactNode;
}

export function CreateProjectModal({
  repositories,
  organizationId,
  trigger,
}: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      repository_id: "",
    },
  });

  // Find the selected repository based on form value
  const selectedRepository = repositories.find(
    (repo) => repo.id === form.watch("repository_id"),
  );

  // Auto-populate fields when repository is selected
  useEffect(() => {
    if (selectedRepository) {
      // Only update if fields are empty (don't overwrite user input)
      if (!form.getValues("name")) {
        form.setValue("name", selectedRepository.name);
      }

      if (!form.getValues("description") && selectedRepository.description) {
        form.setValue("description", selectedRepository.description);
      }
    }
  }, [selectedRepository, form]);

  async function onSubmit(values: ProjectFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          organization_id: organizationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create project");
      }

      const data = await response.json();

      form.reset();
      setOpen(false);
      router.refresh();
      router.push(`/projects/${data.project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      form.setError("root", {
        type: "manual",
        message:
          error instanceof Error
            ? error.message
            : "An error occurred while creating the project",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a project to organize issues within a repository.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="repository_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a repository" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {repositories.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                          <p className="mb-2">No repositories connected</p>
                          <p>
                            <Link
                              href="/settings/repositories"
                              className="text-primary underline underline-offset-4 hover:no-underline"
                            >
                              Connect a repository
                            </Link>{" "}
                            to get started
                          </p>
                        </div>
                      ) : (
                        repositories.map((repo) => (
                          <SelectItem key={repo.id} value={repo.id}>
                            {repo.full_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the repository this project belongs to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your project.
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of what this project is about.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
