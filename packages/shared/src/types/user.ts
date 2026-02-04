export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  eloRating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  avatarUrl: string | null;
  eloRating: number;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
}
