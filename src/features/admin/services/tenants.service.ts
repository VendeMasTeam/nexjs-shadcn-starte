import type {
  CreateTenantUserPayload,
  Tenant,
  TenantActividadItem,
  TenantFacturaItem,
  TenantUser,
} from 'src/features/admin/types/admin.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

export const tenantsService = {
  async getAll(params?: PaginationParams): Promise<Tenant[]> {
    const res = await axiosInstance.get(endpoints.admin.tenants.list, { params });
    return res.data; // full response — callers extract .data for the array
  },
  async getById(uid: string): Promise<Tenant> {
    const res = await axiosInstance.get(endpoints.admin.tenants.show(uid));
    return res.data.data;
  },
  async create(data: Partial<Tenant>): Promise<Tenant> {
    const res = await axiosInstance.post(endpoints.admin.tenants.create, data);
    return res.data.data;
  },
  async update(uid: string, data: Partial<Tenant>): Promise<Tenant> {
    const res = await axiosInstance.put(endpoints.admin.tenants.update(uid), data);
    return res.data.data;
  },
  async suspend(uid: string): Promise<Tenant> {
    const res = await axiosInstance.post(endpoints.admin.tenants.suspend(uid));
    return res.data.data;
  },
  async activate(uid: string): Promise<Tenant> {
    const res = await axiosInstance.post(endpoints.admin.tenants.activate(uid));
    return res.data.data;
  },
  async archive(uid: string): Promise<Tenant> {
    const res = await axiosInstance.post(endpoints.admin.tenants.archive(uid));
    return res.data.data;
  },
  async restore(uid: string): Promise<Tenant> {
    const res = await axiosInstance.post(endpoints.admin.tenants.restore(uid));
    return res.data.data;
  },
  // DELETE /admin/tenants/{uid}/purge — borrado FÍSICO e irreversible (schema incluido)
  async purge(uid: string, confirmation: string, deleteSchema = true): Promise<unknown> {
    const res = await axiosInstance.delete(endpoints.admin.tenants.purge(uid), {
      data: { confirmation, delete_schema: deleteSchema },
    });
    return res.data.data;
  },
  async lockUser(tenantUid: string, userUid: string): Promise<void> {
    await axiosInstance.post(endpoints.admin.tenants.lockUser(tenantUid, userUid));
  },
  async unlockUser(tenantUid: string, userUid: string): Promise<void> {
    await axiosInstance.post(endpoints.admin.tenants.unlockUser(tenantUid, userUid));
  },
  async resetUserTwoFactor(tenantUid: string, userUid: string): Promise<TenantUser> {
    const res = await axiosInstance.post(
      endpoints.admin.tenants.resetUserTwoFactor(tenantUid, userUid)
    );
    return res.data.data;
  },
  async createUser(
    tenantUid: string,
    data: CreateTenantUserPayload
  ): Promise<{ reset_email_sent: boolean }> {
    const res = await axiosInstance.post(endpoints.admin.tenants.createUser(tenantUid), data);
    return { reset_email_sent: res.data.data?.reset_email_sent ?? false };
  },
  // PUT — todos los campos opcionales, mandar solo los que cambian
  async updateUser(
    tenantUid: string,
    userUid: string,
    data: Partial<{
      name: string;
      email: string;
      role: string;
      is_active: boolean;
      password: string;
    }>
  ): Promise<TenantUser> {
    const res = await axiosInstance.put(
      endpoints.admin.tenants.updateUser(tenantUid, userUid),
      data
    );
    return res.data.data;
  },
  // DELETE .../purge — borrado FÍSICO e irreversible del usuario (registro, tokens, roles)
  async purgeUser(tenantUid: string, userUid: string, confirmation: string): Promise<unknown> {
    const res = await axiosInstance.delete(endpoints.admin.tenants.purgeUser(tenantUid, userUid), {
      data: { confirmation },
    });
    return res.data.data;
  },
  async getUsers(tenantUid: string, page = 1, perPage = 10) {
    const res = await axiosInstance.get(endpoints.admin.tenants.users(tenantUid), {
      params: { page, per_page: perPage },
    });
    return res.data; // { success, data: TenantUser[], meta: { pagination } } — caller extrae ambos
  },
  async getFacturas(tenantUid: string): Promise<TenantFacturaItem[]> {
    const res = await axiosInstance.get(endpoints.admin.billing.list, {
      params: { tenant_uid: tenantUid },
    });
    return res.data.data ?? [];
  },
  async getActividad(tenantUid: string): Promise<TenantActividadItem[]> {
    const res = await axiosInstance.get(endpoints.admin.telemetry.logs, {
      params: { tenant_uid: tenantUid },
    });
    return res.data.data ?? [];
  },
};
