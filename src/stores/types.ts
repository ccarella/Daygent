// Store types are defined within their respective store files
// This file is kept for backward compatibility but types should be imported directly from store files

import type { Workspace } from "@/types/workspace";
import type { User } from "@/types/user";

// Re-export imported types for backward compatibility
export type { Workspace, User };