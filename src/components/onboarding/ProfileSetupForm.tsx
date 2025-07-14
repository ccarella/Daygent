"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileSetupFormProps {
  userId: string;
  defaultEmail: string;
  defaultName?: string;
  defaultAvatar?: string;
}

export function ProfileSetupForm({
  userId,
  defaultEmail,
  defaultName,
  defaultAvatar,
}: ProfileSetupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(defaultName || "");
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let uploadedAvatarUrl = avatarUrl;

      // Upload avatar if file selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("userId", userId);

        const response = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Avatar upload failed");

        const { url } = await response.json();
        uploadedAvatarUrl = url;
      }

      // Update profile
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatar_url: uploadedAvatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile update failed:", errorData);
        throw new Error(errorData.error || "Profile update failed");
      }

      toast.success("Profile updated successfully!");
      router.push("/onboarding/workspace");
    } catch (error) {
      console.error("Profile setup error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>
            {name?.[0] || defaultEmail[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
          <Label
            htmlFor="avatar"
            className="cursor-pointer text-blue-600 hover:text-blue-700"
          >
            Upload Avatar
          </Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={defaultEmail}
          disabled
          className="bg-gray-50"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !name.trim()}
      >
        {isLoading ? "Saving..." : "Continue to Workspace Setup"}
      </Button>
    </form>
  );
}
