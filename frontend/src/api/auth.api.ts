import apiClient from './client';
import { ApiResponse, User } from '@/types';

export interface RegisterRequest {
  email: string;
  password: string;
  businessName: string;
  businessNumber?: string;
  isGeneralTaxpayer?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

export interface UpdateProfileRequest {
  businessName?: string;
  businessNumber?: string | null;
  isGeneralTaxpayer?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResult> => {
    const response = await apiClient.post<ApiResponse<AuthResult>>('/api/v1/auth/register', data);
    return response.data.data;
  },

  login: async (data: LoginRequest): Promise<AuthResult> => {
    const response = await apiClient.post<ApiResponse<AuthResult>>('/api/v1/auth/login', data);
    return response.data.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/api/v1/auth/me');
    return response.data.data;
  },

  updateMe: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>('/api/v1/auth/me', data);
    return response.data.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.patch('/api/v1/auth/password', data);
  },
};
