import { z } from 'zod';
import { api } from '../lib/axios';
import {
  AuthResponse,
  AuthResponseSchema,
  UserSchema,
  ChangePasswordInput,
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from '../types';

const BASE = '/api/v1/auth';

export const authService = {
  signup: async (data: SignupInput): Promise<AuthResponse> =>
    AuthResponseSchema.parse((await api.post(`${BASE}/signup`, data)).data),

  login: async (data: LoginInput): Promise<AuthResponse> =>
    AuthResponseSchema.parse((await api.post(`${BASE}/login`, data)).data),

  logout: async (): Promise<void> => {
    await api.post(`${BASE}/logout`);
  },

  forgotPassword: async (data: ForgotPasswordInput) => (await api.post(`${BASE}/forgot-password`, data)).data,

  resetPassword: async (token: string, data: ResetPasswordInput): Promise<AuthResponse> =>
    AuthResponseSchema.parse((await api.post(`${BASE}/reset-password/${token}`, { password: data.password })).data),

  updateProfile: async (name: string) =>
    z.object({ data: z.object({ user: UserSchema }) }).parse((await api.patch(`${BASE}/profile`, { name })).data).data
      .user,

  changePassword: async (data: ChangePasswordInput): Promise<AuthResponse> =>
    AuthResponseSchema.parse(
      (await api.patch(`${BASE}/password`, { currentPassword: data.currentPassword, newPassword: data.newPassword }))
        .data
    ),

  deleteAccount: async (password: string): Promise<void> => {
    await api.delete(`${BASE}/account`, { data: { password } });
  }
};
