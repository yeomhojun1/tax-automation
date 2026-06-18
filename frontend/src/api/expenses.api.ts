import apiClient from './client';
import { ApiResponse, Expense, ExpenseCategory } from '@/types';

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  receiptFileKey?: string;
  taxInvoiceId?: number;
}

export interface ExpenseQueryParams {
  year?: number;
  month?: number;
  category?: ExpenseCategory;
  search?: string;
}

export const expensesApi = {
  getAll: async (params?: ExpenseQueryParams): Promise<Expense[]> => {
    const response = await apiClient.get<ApiResponse<Expense[]>>('/api/v1/expenses', { params });
    return response.data.data;
  },

  create: async (data: CreateExpenseRequest): Promise<Expense> => {
    const response = await apiClient.post<ApiResponse<Expense>>('/api/v1/expenses', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<CreateExpenseRequest>): Promise<Expense> => {
    const response = await apiClient.patch<ApiResponse<Expense>>(`/api/v1/expenses/${id}`, data);
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`);
  },
};
