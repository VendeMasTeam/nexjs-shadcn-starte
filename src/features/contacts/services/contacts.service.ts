import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

// ─────────────────────────────────────────────────────────────────────────────
// Thin service — pure HTTP wrapper. All business logic lives in the hook.
// ─────────────────────────────────────────────────────────────────────────────

export const contactsService = {
  // Accounts (companies — B2B)
  accounts: {
    list: async (params?: PaginationParams) => {
      const res = await axiosInstance.get(endpoints.contacts.accounts.list, { params });
      return res.data;
    },
    getById: async (uid: string) => {
      const res = await axiosInstance.get(endpoints.contacts.accounts.detail(uid));
      return res.data?.data ?? res.data;
    },
    create: async (payload: Record<string, unknown>) => {
      const res = await axiosInstance.post(endpoints.contacts.accounts.create, payload);
      return res.data?.data ?? res.data;
    },
    update: async (uid: string, payload: Record<string, unknown>) => {
      const res = await axiosInstance.put(endpoints.contacts.accounts.update(uid), payload);
      return res.data?.data ?? res.data;
    },
    delete: async (uid: string) => {
      await axiosInstance.delete(endpoints.contacts.accounts.delete(uid));
    },
  },

  // Contacts (persons + government — B2C/B2G)
  contacts: {
    list: async (params?: PaginationParams) => {
      const res = await axiosInstance.get(endpoints.contacts.contacts.list, { params });
      return res.data;
    },
    getById: async (uid: string) => {
      const res = await axiosInstance.get(endpoints.contacts.contacts.detail(uid));
      return res.data?.data ?? res.data;
    },
    create: async (payload: Record<string, unknown>) => {
      const res = await axiosInstance.post(endpoints.contacts.contacts.create, payload);
      return res.data?.data ?? res.data;
    },
    update: async (uid: string, payload: Record<string, unknown>) => {
      const res = await axiosInstance.put(endpoints.contacts.contacts.update(uid), payload);
      return res.data?.data ?? res.data;
    },
    delete: async (uid: string) => {
      await axiosInstance.delete(endpoints.contacts.contacts.delete(uid));
    },
  },

  // Duplicate check — raw passthrough (snake_case in, snake_case out)
  checkDuplicate: async (payload: {
    email: string;
    tax_id?: string | null;
    exclude_uid?: string | null;
  }) => {
    const res = await axiosInstance.post(endpoints.contacts.checkDuplicate, payload);
    return res.data?.data ?? res.data;
  },

  // Relations — thin wrappers
  getRelations: async (
    entityUid: string
  ): Promise<
    Array<{ related_uid: string; related_name: string; related_type: string; role?: string }>
  > => {
    const res = await axiosInstance.get(endpoints.relations.byEntity('contact', entityUid));
    return (res.data?.data ?? []) as Array<{
      related_uid: string;
      related_name: string;
      related_type: string;
      role?: string;
    }>;
  },

  addRelacion: async (entityAUid: string, entityBUid: string, role?: string): Promise<void> => {
    await axiosInstance.post(endpoints.relations.create, {
      from_type: 'contact',
      from_uid: entityAUid,
      to_type: 'contact',
      to_uid: entityBUid,
      relation_type: role ?? 'related',
    });
  },
};
