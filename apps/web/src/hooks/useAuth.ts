'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserPublic } from '@codeduel/shared';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserPublic | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      setAccessToken: (token: string) => {
        api.setAccessToken(token);
        connectSocket();
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.login({ email, password });
          set({ user: response.user, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.register({ username, email, password });
          set({ user: response.user, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } finally {
          disconnectSocket();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        const token = api.getAccessToken();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const user = await api.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
          connectSocket();
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
