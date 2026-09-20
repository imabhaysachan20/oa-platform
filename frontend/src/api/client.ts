import axios from 'axios';
import { useExamStore } from '../store/examStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ubicode_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const detail = error.response?.data?.detail || '';
      const isConcurrent =
        detail.includes('SESSION_SUPERSEDED') ||
        error.response?.headers?.['x-session-status'] === 'concurrent_session_terminated';

      localStorage.removeItem('ubicode_token');
      localStorage.removeItem('ubicode_user');
      useExamStore.getState().resetExamState();

      if (window.location.pathname !== '/login') {
        window.location.href = isConcurrent ? '/login?reason=concurrent_session' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
