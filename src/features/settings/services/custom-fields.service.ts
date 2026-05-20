import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

import type { CustomField } from '../types/settings.types';

export const customFieldsService = {
  async getModules(): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.settings.customFields.modules);
    return res.data;
  },

  async getAll(params?: PaginationParams & { module?: string; search?: string }): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.settings.customFields.list, { params });
    return res.data;
  },

  async create(data: Omit<CustomField, 'uid' | 'created_at'>): Promise<CustomField> {
    const res = await axiosInstance.post(endpoints.settings.customFields.create, data);
    return res.data?.data ?? res.data;
  },

  async update(uid: string, data: Partial<CustomField>): Promise<CustomField> {
    const res = await axiosInstance.put(endpoints.settings.customFields.update(uid), data);
    return res.data?.data ?? res.data;
  },

  async delete(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.settings.customFields.delete(uid));
  },
};
