import type { Workspace } from "@/types/workspace";
import type { User } from "@/types/user";

// Re-export imported types
export type { Workspace, User };

export interface AuthState {
  user: User | null;
  activeWorkspace: Workspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  login: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;
