import type { Organization } from "@/types/organization";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_id: number | null;
  github_username: string | null;
}

export interface AuthState {
  user: User | null;
  activeOrganization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setActiveOrganization: (org: Organization | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;
