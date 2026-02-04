import { AuthResponse, UserPublic, CreateUserInput, LoginInput } from '@codeduel/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: CreateUserInput): Promise<AuthResponse> {
    const response = await this.request<{ user: UserPublic; accessToken: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    this.accessToken = response.accessToken;
    return { user: response.user, tokens: { accessToken: response.accessToken, refreshToken: '' } };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await this.request<{ user: UserPublic; accessToken: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    this.accessToken = response.accessToken;
    return { user: response.user, tokens: { accessToken: response.accessToken, refreshToken: '' } };
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.accessToken = null;
  }

  async refreshToken(userId: string): Promise<string> {
    const response = await this.request<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    this.accessToken = response.accessToken;
    return response.accessToken;
  }

  async getMe(): Promise<UserPublic> {
    return this.request<UserPublic>('/api/auth/me');
  }

  // User endpoints
  async getUser(id: string): Promise<UserPublic> {
    return this.request<UserPublic>(`/api/users/${id}`);
  }

  async getLeaderboard(limit = 10, offset = 0): Promise<UserPublic[]> {
    return this.request<UserPublic[]>(`/api/users/leaderboard?limit=${limit}&offset=${offset}`);
  }

  async updateProfile(data: { username?: string; avatarUrl?: string }): Promise<UserPublic> {
    return this.request<UserPublic>('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  getGitHubAuthUrl(): string {
    return `${API_URL}/api/auth/github`;
  }
}

export const api = new ApiClient();
