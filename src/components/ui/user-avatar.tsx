"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const fallback = React.useMemo(() => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  }, [name]);

  // Reset error state when avatarUrl changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [avatarUrl]);

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {avatarUrl && !imageError && (
        <AvatarImage
          src={avatarUrl}
          alt={name || "User"}
          onLoadingStatusChange={(status) => {
            if (status === "loaded") {
              setImageLoaded(true);
            } else if (status === "error") {
              console.warn("Avatar image failed to load:", avatarUrl);
              setImageError(true);
            }
          }}
        />
      )}
      <AvatarFallback delayMs={imageLoaded ? 0 : 600}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}