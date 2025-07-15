export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_id: number | null;
  github_username: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}
