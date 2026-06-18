import apiClient from './client';
import { ApiResponse, TaxInvoice, InvoiceDirection, InvoiceSummary } from '@/types';

export interface CreateInvoiceRequest {
  direction: InvoiceDirection;
  counterpartyName: string;
  counterpartyBizNumber?: string;
  supplyAmount: number;
  taxAmount: number;
  issueDate: string;
}

export interface InvoiceQueryParams {
  direction?: InvoiceDirection;
  startDate?: string;
  endDate?: string;
}

export interface SummaryQueryParams {
  year: number;
  quarter: number;
}

export const invoicesApi = {
  upload: async (file: File): Promise<TaxInvoice> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<TaxInvoice>>(
      '/api/v1/tax-invoices/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  getAll: async (params?: InvoiceQueryParams): Promise<TaxInvoice[]> => {
    const response = await apiClient.get<ApiResponse<TaxInvoice[]>>('/api/v1/tax-invoices', {
      params,
    });
    return response.data.data;
  },

  getSummary: async (params: SummaryQueryParams): Promise<InvoiceSummary> => {
    const response = await apiClient.get<ApiResponse<InvoiceSummary>>(
      '/api/v1/tax-invoices/summary',
      { params },
    );
    return response.data.data;
  },

  createManual: async (data: CreateInvoiceRequest): Promise<TaxInvoice> => {
    const response = await apiClient.post<ApiResponse<TaxInvoice>>('/api/v1/tax-invoices', data);
    return response.data.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/tax-invoices/${id}`);
  },
};
