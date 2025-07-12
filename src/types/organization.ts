export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subscription_status: "trial" | "active" | "inactive" | "cancelled";
  subscription_id?: string;
  trial_ends_at?: string;
  seats_used: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
}
