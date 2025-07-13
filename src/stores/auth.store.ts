import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { User } from "@/types/user";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useWorkspaceStore } from "./workspace.store";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (provider?: 'github' | 'google') => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearError: () => void;
}

// Debug logger
const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[Auth]', ...args);
  }
};

const supabase = createClient();

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // State
      user: null,
      session: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }, false, "setUser"),
      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
      clearError: () => set({ error: null }, false, "clearError"),

      login: async (provider = 'github') => {
        set({ isLoading: true, error: null }, false, "login/start");

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              scopes: provider === 'github' ? 'repo read:user user:email' : undefined,
            },
          });

          if (error) throw error;
          
          logger.debug(`OAuth sign-in initiated with ${provider}`);
        } catch (error) {
          logger.error('Login failed:', error);
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : "Login failed",
            },
            false,
            "login/error",
          );
          throw error;
        }
      },

      loginWithEmail: async (email, password) => {
        set({ isLoading: true, error: null }, false, "loginWithEmail/start");

        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
        } catch (error) {
          logger.error('Email login failed:', error);
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : "Login failed",
            },
            false,
            "loginWithEmail/error",
          );
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true }, false, "logout/start");

        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          set(
            {
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            },
            false,
            "logout/success",
          );
          
          // Clear workspace store too
          const { reset } = useWorkspaceStore.getState();
          reset();
        } catch (error) {
          logger.error('Logout failed:', error);
          set(
            {
              isLoading: false,
              error: error instanceof Error ? error.message : "Logout failed",
            },
            false,
            "logout/error",
          );
          throw error;
        }
      },

      checkSession: async () => {
        set({ isLoading: true }, false, "checkSession/start");

        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            logger.error('Session error:', sessionError);
            set({ user: null, session: null, isLoading: false, isAuthenticated: false }, false, "checkSession/error");
            return;
          }

          if (!session) {
            set({ user: null, session: null, isLoading: false, isAuthenticated: false }, false, "checkSession/no-session");
            return;
          }

          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !authUser) {
            logger.error('User error:', userError);
            set({ user: null, session: null, isLoading: false, isAuthenticated: false }, false, "checkSession/no-user");
            return;
          }

          // Try to get user profile from database
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          const user: User = {
            id: authUser.id,
            email: authUser.email || "",
            name: profile?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
            avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
            github_id: profile?.github_id || (authUser.app_metadata?.provider === "github" ? authUser.user_metadata?.provider_id : null),
            github_username: profile?.github_username || authUser.user_metadata?.user_name || null,
            google_id: profile?.google_id || null,
            created_at: profile?.created_at || new Date().toISOString(),
            updated_at: profile?.updated_at || new Date().toISOString(),
          };

          set(
            {
              user,
              session,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            },
            false,
            "checkSession/success",
          );
          
          // Load workspaces if authenticated
          if (user) {
            const { loadWorkspaces } = useWorkspaceStore.getState();
            loadWorkspaces();
          }
        } catch (error) {
          logger.error('Error checking session:', error);
          set(
            {
              user: null,
              session: null,
              isLoading: false,
              isAuthenticated: false,
              error: error instanceof Error ? error.message : "Failed to check session",
            },
            false,
            "checkSession/error",
          );
        }
      },
      
      initialize: async () => {
        const { checkSession } = useAuthStore.getState();
        await checkSession();
      },
    }),
    {
      name: "auth-store",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

// Set up auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  logger.debug('Auth state changed:', event);
  
  const { setUser, setLoading } = useAuthStore.getState();
  
  if (session?.user) {
    setLoading(true);
    
    try {
      // Try to get user profile from database
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const user: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name || null,
        avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
        github_id: profile?.github_id || (session.user.app_metadata?.provider === "github" ? session.user.user_metadata?.provider_id : null),
        github_username: profile?.github_username || session.user.user_metadata?.user_name || null,
        google_id: profile?.google_id || null,
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || new Date().toISOString(),
      };

      setUser(user);
      
      // Load workspaces
      const { loadWorkspaces } = useWorkspaceStore.getState();
      loadWorkspaces();
    } catch (error) {
      logger.error('Error in auth state change handler:', error);
      // Still set basic user info even if profile fetch fails
      const user: User = {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.name || null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        github_id: null,
        github_username: session.user.user_metadata?.user_name || null,
        google_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(user);
    } finally {
      setLoading(false);
    }
  } else {
    setUser(null);
  }
});

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkSession();
}