import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

import type {
  CustomField,
  CustomFieldCreatePayload,
  CustomFieldValuePayload,
} from '../types/settings.types';

export const customFieldsService = {
  async getModules(): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.settings.customFields.modules);
    return res.data;
  },

  async getAll(params?: PaginationParams & { module?: string; search?: string }): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.settings.customFields.list, { params });
    return res.data;
  },

  async create(data: CustomFieldCreatePayload): Promise<CustomField> {
    const res = await axiosInstance.post(endpoints.settings.customFields.create, data);
    return res.data?.data ?? res.data;
  },

  async update(uid: string, data: Partial<CustomFieldCreatePayload>): Promise<CustomField> {
    const res = await axiosInstance.put(endpoints.settings.customFields.update(uid), data);
    return res.data?.data ?? res.data;
  },

  async delete(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.settings.customFields.delete(uid));
  },

  async saveValue(payload: CustomFieldValuePayload): Promise<void> {
    await axiosInstance.post(endpoints.settings.customFields.value, payload);
  },

  async saveAll(
    entityUid: string,
    entityType: string,
    values: Record<string, unknown>
  ): Promise<void> {
    const entries = Object.entries(values).filter(
      ([, v]) => v !== undefined && v !== '' && v !== null
    );
    if (entries.length === 0) return;
    await Promise.allSettled(
      entries.map(([fieldUid, value]) =>
        this.saveValue({
          entity_type: entityType,
          entity_uid: entityUid,
          custom_field_uid: fieldUid,
          value,
        })
      )
    );
  },
};
