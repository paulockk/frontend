export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "ADMIN" | "USER";
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
