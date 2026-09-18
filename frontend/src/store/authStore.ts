import { create } from 'zustand';
import { User } from '../types';
import { useExamStore } from './examStore';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('ubicode_token');
  const savedUser = localStorage.getItem('ubicode_user');

  let initialUser: User | null = null;
  try {
    initialUser = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    initialUser = null;
  }

  return {
    token: savedToken,
    user: initialUser,
    isAuthenticated: !!savedToken,
    setAuth: (token: string, user: User) => {
      localStorage.setItem('ubicode_token', token);
      localStorage.setItem('ubicode_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      const userRaw = localStorage.getItem('ubicode_user');
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          if (u?.id) {
            // Clean up user-scoped exam keys and any legacy exam keys
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith(`u_${u.id}_exam_`) || key.startsWith('exam_')) {
                localStorage.removeItem(key);
              }
            });
          }
        } catch {}
      }
      localStorage.removeItem('ubicode_token');
      localStorage.removeItem('ubicode_user');
      useExamStore.getState().resetExamState();
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
