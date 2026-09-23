import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PlatformBranding } from 'src/shared/hooks/use-branding';

// POST /admin/branding — multipart/form-data, requiere admin.tenants.manage
export const brandingService = {
  async update(formData: FormData): Promise<PlatformBranding> {
    const res = await axiosInstance.post(endpoints.branding.update, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data ?? res.data;
  },
};
