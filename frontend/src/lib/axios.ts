import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// "" (empty) = same origin: Vite dev proxy locally, Nginx reverse proxy in Docker.
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

let refreshing: Promise<string> | null = null;

// Uses a bare axios call so this request doesn't go through our own interceptors
const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken, setAuth, user } = useAuthStore.getState();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
  const data = res.data.data;
  setAuth(data.token, data.refreshToken, data.user ?? user);
  return data.token as string;
};

const forceLogout = () => {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

// On 401: silently refresh the access token once, then retry the original request.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !isAuthCall) {
      if (!original._retry && useAuthStore.getState().refreshToken) {
        original._retry = true;
        try {
          refreshing ??= refreshAccessToken().finally(() => {
            refreshing = null;
          });
          const newToken = await refreshing;
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          forceLogout();
        }
      } else {
        forceLogout();
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.message || fallback;
  return error instanceof Error ? error.message : fallback;
};
