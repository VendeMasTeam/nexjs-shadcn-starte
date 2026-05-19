import type {
  BillingExportFilters,
  BillingFilters,
  BillingSummary,
  Factura,
} from 'src/features/admin/types/admin.types';
import axiosInstance, { endpoints } from 'src/lib/axios';

export type { BillingExportFilters, BillingFilters };

export const billingService = {
  async getAll(params?: BillingFilters): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.admin.billing.list, { params });
    return res.data;
  },
  async getSummary(): Promise<BillingSummary> {
    const res = await axiosInstance.get(endpoints.admin.billing.summary);
    return res.data.data;
  },
  async marcarPagada(uid: string): Promise<Factura> {
    const res = await axiosInstance.post(endpoints.admin.billing.markPaid(uid));
    return res.data.data;
  },
  async marcarPagadas(uids: string[]): Promise<Factura[]> {
    const res = await axiosInstance.post(endpoints.admin.billing.markPaidBulk, { ids: uids });
    return res.data.data;
  },
  async exportReport(params?: BillingExportFilters): Promise<Blob> {
    const res = await axiosInstance.get(endpoints.admin.billing.export, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};
