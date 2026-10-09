import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => !!s.token);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};
