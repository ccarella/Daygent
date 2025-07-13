export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      github_installations: {
        Row: {
          github_account_name: string;
          github_account_type: string;
          id: string;
          installation_id: number;
          installed_at: string | null;
          installed_by: string | null;
          workspace_id: string | null;
        };
        Insert: {
          github_account_name: string;
          github_account_type: string;
          id?: string;
          installation_id: number;
          installed_at?: string | null;
          installed_by?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          github_account_name?: string;
          github_account_type?: string;
          id?: string;
          installation_id?: number;
          installed_at?: string | null;
          installed_by?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "github_installations_installed_by_fkey";
            columns: ["installed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "github_installations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          assignee_github_login: string | null;
          author_github_login: string | null;
          body: string | null;
          created_at: string | null;
          github_closed_at: string | null;
          github_created_at: string | null;
          github_issue_id: number | null;
          github_issue_number: number;
          github_node_id: string | null;
          github_updated_at: string | null;
          id: string;
          labels: Json | null;
          repository_id: string | null;
          state: string | null;
          title: string;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          assignee_github_login?: string | null;
          author_github_login?: string | null;
          body?: string | null;
          created_at?: string | null;
          github_closed_at?: string | null;
          github_created_at?: string | null;
          github_issue_id?: number | null;
          github_issue_number: number;
          github_node_id?: string | null;
          github_updated_at?: string | null;
          id?: string;
          labels?: Json | null;
          repository_id?: string | null;
          state?: string | null;
          title: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          assignee_github_login?: string | null;
          author_github_login?: string | null;
          body?: string | null;
          created_at?: string | null;
          github_closed_at?: string | null;
          github_created_at?: string | null;
          github_issue_id?: number | null;
          github_issue_number?: number;
          github_node_id?: string | null;
          github_updated_at?: string | null;
          id?: string;
          labels?: Json | null;
          repository_id?: string | null;
          state?: string | null;
          title?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issues_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      repositories: {
        Row: {
          created_at: string | null;
          default_branch: string | null;
          full_name: string;
          github_id: number;
          id: string;
          installation_id: number | null;
          last_synced_at: string | null;
          name: string;
          owner: string;
          private: boolean | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          default_branch?: string | null;
          full_name: string;
          github_id: number;
          id?: string;
          installation_id?: number | null;
          last_synced_at?: string | null;
          name: string;
          owner: string;
          private?: boolean | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          default_branch?: string | null;
          full_name?: string;
          github_id?: number;
          id?: string;
          installation_id?: number | null;
          last_synced_at?: string | null;
          name?: string;
          owner?: string;
          private?: boolean | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_status: {
        Row: {
          created_at: string | null;
          id: string;
          last_issue_cursor: string | null;
          last_issue_sync: string | null;
          repository_id: string | null;
          sync_in_progress: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          last_issue_cursor?: string | null;
          last_issue_sync?: string | null;
          repository_id?: string | null;
          sync_in_progress?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          last_issue_cursor?: string | null;
          last_issue_sync?: string | null;
          repository_id?: string | null;
          sync_in_progress?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sync_status_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          github_id: number | null;
          github_username: string | null;
          google_id: string | null;
          id: string;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          github_id?: number | null;
          github_username?: string | null;
          google_id?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          github_id?: number | null;
          github_username?: string | null;
          google_id?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          joined_at: string | null;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          id?: string;
          joined_at?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          id?: string;
          joined_at?: string | null;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_organization_slug_available: {
        Args: { p_slug: string };
        Returns: boolean;
      };
      create_organization_with_owner: {
        Args: {
          p_name: string;
          p_slug: string;
          p_description: string;
          p_user_id: string;
        };
        Returns: {
          id: string;
          name: string;
          slug: string;
          description: string;
          subscription_status: string;
          subscription_id: string;
          trial_ends_at: string;
          seats_used: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      create_workspace_with_member: {
        Args: { p_name: string; p_slug: string; p_user_id: string };
        Returns: string;
      };
      get_user_default_organization: {
        Args: { user_id: string };
        Returns: {
          id: string;
          name: string;
          slug: string;
          subscription_status: string;
          trial_ends_at: string;
          seats_used: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      is_workspace_slug_available: {
        Args: { p_slug: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

// Specific table types
export type Workspace = Tables<"workspaces">;
export type User = Tables<"users">;
export type WorkspaceMember = Tables<"workspace_members">;
export type GitHubInstallation = Tables<"github_installations">;
export type Repository = Tables<"repositories">;
export type Issue = Tables<"issues">;
export type SyncStatus = Tables<"sync_status">;

// Utility types for database operations
export type InsertWorkspace = Omit<
  Database["public"]["Tables"]["workspaces"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateWorkspace = Omit<
  Database["public"]["Tables"]["workspaces"]["Update"],
  "id" | "created_at" | "updated_at"
>;

export type InsertUser = Omit<
  Database["public"]["Tables"]["users"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateUser = Omit<
  Database["public"]["Tables"]["users"]["Update"],
  "id" | "created_at" | "updated_at"
>;

export type InsertRepository = Omit<
  Database["public"]["Tables"]["repositories"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateRepository = Omit<
  Database["public"]["Tables"]["repositories"]["Update"],
  "id" | "created_at" | "updated_at"
>;

export type InsertIssue = Omit<
  Database["public"]["Tables"]["issues"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export type UpdateIssue = Omit<
  Database["public"]["Tables"]["issues"]["Update"],
  "id" | "created_at" | "updated_at"
>;

export type InsertWorkspaceMember = Omit<
  Database["public"]["Tables"]["workspace_members"]["Insert"],
  "id" | "joined_at"
>;

export type UpdateWorkspaceMember = Omit<
  Database["public"]["Tables"]["workspace_members"]["Update"],
  "id" | "joined_at"
>;

// Type guards for date string conversion
export const isDateString = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  return !isNaN(Date.parse(value));
};

// Utility function to convert date strings to Date objects
export const parseDates = <T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[],
): T => {
  const result = { ...obj };
  dateFields.forEach((field) => {
    if (field in result && result[field] && isDateString(result[field])) {
      (result as Record<string, unknown>)[field] = new Date(
        result[field] as string,
      );
    }
  });
  return result;
};

// Define date fields for each table
export const dateFields = {
  workspaces: ["created_at", "updated_at"],
  users: ["created_at", "updated_at"],
  workspace_members: ["joined_at"],
  github_installations: ["installed_at"],
  repositories: ["created_at", "updated_at", "last_synced_at"],
  issues: [
    "created_at",
    "updated_at",
    "github_created_at",
    "github_updated_at",
    "github_closed_at",
  ],
  sync_status: ["created_at", "updated_at", "last_issue_sync"],
} as const;
