import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';

interface AuthUser {
  userId: string;
  username: string;
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthUser>('/api/auth/login', { email, password });
          set({ user: response, isLoading: false });
        } catch {
          set({ error: 'Invalid email or password', isLoading: false });
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthUser>('/api/auth/register', { username, email, password });
          set({ user: response, isLoading: false });
        } catch {
          set({ error: 'Registration failed. Please try again.', isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, error: null });
      },

      clearError: () => set({ error: null }),

      isAuthenticated: () => {
        const { user } = get();
        if (!user) return false;
        return new Date(user.expiresAt) > new Date();
      },
    }),
    {
      name: 'draughts-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
