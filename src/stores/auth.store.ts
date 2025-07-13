import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/user";
import type { Session } from "@supabase/supabase-js";
import { useWorkspaceStore } from "./workspace.store";

// Minimal logging
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

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (provider: 'github' | 'google') => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((
  (set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    error: null,


    login: async (provider) => {
      set({ isLoading: true, error: null });
      
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
      } catch (error) {
        logger.error('Login failed:', error);
        set({ 
          error: error instanceof Error ? error.message : "Login failed",
          isLoading: false 
        });
        throw error;
      }
    },

    loginWithEmail: async (email, password) => {
      set({ isLoading: true, error: null });
      
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Profile will be loaded by checkSession
        await get().checkSession();
      } catch (error) {
        logger.error('Email login failed:', error);
        set({ 
          error: error instanceof Error ? error.message : "Login failed",
          isLoading: false 
        });
        throw error;
      }
    },

    signup: async (email, password) => {
      set({ isLoading: true, error: null });
      
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
      } catch (error) {
        logger.error('Signup failed:', error);
        set({ 
          error: error instanceof Error ? error.message : "Signup failed",
          isLoading: false 
        });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Clear all state
        set({ 
          user: null, 
          session: null, 
          isLoading: false,
          error: null 
        });
        
        // Clear workspace store too
        const { reset } = useWorkspaceStore.getState();
        reset();
        
        // Redirect to home
        window.location.href = "/";
      } catch (error) {
        logger.error('Logout failed:', error);
        set({ 
          error: error instanceof Error ? error.message : "Logout failed",
          isLoading: false 
        });
      }
    },


    checkSession: async () => {
      set({ isLoading: true });
      
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            logger.error('Profile fetch error:', profileError);
          }

          set({
            session,
            user: profile || null,
            isLoading: false,
            error: null,
          });

          // Load workspaces if authenticated
          if (profile) {
            const { loadWorkspaces } = useWorkspaceStore.getState();
            loadWorkspaces();
          }
        } else {
          set({
            session: null,
            user: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        logger.error('Session check failed:', error);
        set({
          session: null,
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Session check failed",
        });
      }
    },

    updateProfile: async (updates) => {
      const { user } = get();
      if (!user) throw new Error("Not authenticated");

      set({ isLoading: true, error: null });
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select()
          .single();

        if (error) throw error;
        
        set({ user: data, isLoading: false });
      } catch (error) {
        logger.error('Profile update failed:', error);
        set({ 
          error: error instanceof Error ? error.message : "Profile update failed",
          isLoading: false 
        });
        throw error;
      }
    },
  })
));

// Initialize auth on app load
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkSession();
}
