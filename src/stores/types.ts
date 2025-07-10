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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;
