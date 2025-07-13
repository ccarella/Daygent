export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_id: number | null;
  github_username: string | null;
}