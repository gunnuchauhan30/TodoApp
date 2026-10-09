import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/axios';
import {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  AuthResponse
} from '../types';

const useAuthSuccess = (message: string) => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  return (res: AuthResponse) => {
    setAuth(res.data.token, res.data.refreshToken, res.data.user);
    toast.success(message.replace('{name}', res.data.user.name));
    navigate('/dashboard');
  };
};

export const useSignup = () =>
  useMutation({
    mutationFn: (d: SignupInput) => authService.signup(d),
    onSuccess: useAuthSuccess('Welcome aboard, {name}! 🎉'),
    onError: (e) => toast.error(getErrorMessage(e, 'Signup failed'))
  });

export const useLogin = () =>
  useMutation({
    mutationFn: (d: LoginInput) => authService.login(d),
    onSuccess: useAuthSuccess('Welcome back, {name}!'),
    onError: (e) => toast.error(getErrorMessage(e, 'Login failed'))
  });

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (d: ForgotPasswordInput) => authService.forgotPassword(d),
    onError: (e) => toast.error(getErrorMessage(e, 'Could not process request'))
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, data }: { token: string; data: ResetPasswordInput }) =>
      authService.resetPassword(token, data),
    onSuccess: useAuthSuccess('Password updated. Welcome back, {name}!'),
    onError: (e) => toast.error(getErrorMessage(e, 'Reset failed'))
  });

export const useLogout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  return async () => {
    try {
      await authService.logout(); // revoke the refresh token server-side
    } catch {
      /* token may already be expired - still log out locally */
    }
    logout();
    toast.success('Logged out');
    navigate('/login');
  };
};

export const useUpdateProfile = () => {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (name: string) => authService.updateProfile(name),
    onSuccess: (user) => {
      setUser(user);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not update profile'))
  });
};

export const useChangePassword = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (d: ChangePasswordInput) => authService.changePassword(d),
    onSuccess: (res) => {
      setAuth(res.data.token, res.data.refreshToken, res.data.user); // keep this device signed in
      toast.success('Password changed. Other devices were signed out.');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not change password'))
  });
};

export const useDeleteAccount = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: (password: string) => authService.deleteAccount(password),
    onSuccess: () => {
      logout();
      toast.success('Your account and data were deleted');
      navigate('/');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not delete account'))
  });
};
