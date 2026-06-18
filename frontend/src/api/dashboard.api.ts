import apiClient from './client';
import { ApiResponse, DashboardSummary } from '@/types';

export const dashboardApi = {
  getSummary: async (year?: number): Promise<DashboardSummary> => {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>('/api/v1/dashboard/summary', {
      params: year ? { year } : undefined,
    });
    return response.data.data;
  },
};
