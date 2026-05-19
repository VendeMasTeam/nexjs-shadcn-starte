import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

import type { Invoice, Payment } from '../types/sales.types';

export const invoiceService = {
  async getList(params?: PaginationParams & { status?: string }): Promise<Invoice[]> {
    const res = await axiosInstance.get(endpoints.sales.financeInvoices, { params });
    return res.data; // full response — callers extract .data for the array
  },

  async getByQuotation(uid: string): Promise<Invoice[]> {
    const res = await axiosInstance.get(endpoints.sales.invoicesByQuotation(uid));
    return res.data.data ?? [];
  },

  async getOne(uid: string): Promise<Invoice> {
    const res = await axiosInstance.get(`${endpoints.sales.financeInvoices}/${uid}`);
    return res.data.data;
  },

  async create(data: Partial<Invoice>): Promise<Invoice> {
    const res = await axiosInstance.post(endpoints.sales.financeInvoices, data);
    return res.data.data;
  },

  async registerPayment(invoiceUid: string, data: Partial<Payment>): Promise<Payment> {
    const res = await axiosInstance.post(endpoints.sales.financePayments, {
      ...data,
      invoice_uid: invoiceUid,
    });
    return res.data.data;
  },

  async getPaymentHistory(invoiceUid: string): Promise<Payment[]> {
    const res = await axiosInstance.get(endpoints.sales.paymentHistory(invoiceUid));
    return res.data.data;
  },

  async send(
    invoiceUid: string,
    data?: { recipient_email?: string; subject?: string; message?: string }
  ): Promise<void> {
    await axiosInstance.post(endpoints.sales.invoiceSend(invoiceUid), data ?? {});
  },
};
