import axiosInstance, { endpoints } from 'src/lib/axios';

// ─── Thin service — only raw API calls, no business logic ──────────────────

export const reportsService = {
  async getSalesReport(params: Record<string, unknown>) {
    const res = await axiosInstance.get(endpoints.reports.sales, { params });
    // Unwrap { success, data } wrapper from backend
    return res.data?.data ?? res.data;
  },

  async getInventoryReport(params: Record<string, unknown>) {
    const res = await axiosInstance.get(endpoints.reports.inventory, { params });
    // Unwrap { success, data } wrapper from backend
    return res.data?.data ?? res.data;
  },
};
