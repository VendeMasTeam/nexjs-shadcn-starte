import type {
  PlatformPermission,
  PlatformRole,
  PlatformRolePayload,
} from 'src/features/admin/types/admin.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

export const platformRolesService = {
  async getAll(params?: PaginationParams): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.admin.platform.roles.list, { params });
    return res.data;
  },
  async getById(uid: string): Promise<PlatformRole> {
    const res = await axiosInstance.get(endpoints.admin.platform.roles.show(uid));
    return res.data.data;
  },
  async create(data: PlatformRolePayload): Promise<PlatformRole> {
    const res = await axiosInstance.post(endpoints.admin.platform.roles.create, data);
    return res.data.data;
  },
  async update(uid: string, data: Partial<PlatformRolePayload>): Promise<PlatformRole> {
    const res = await axiosInstance.put(endpoints.admin.platform.roles.update(uid), data);
    return res.data.data;
  },
  async delete(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.admin.platform.roles.delete(uid));
  },
  async syncPermissions(uid: string, permissions: string[]): Promise<PlatformRole> {
    const res = await axiosInstance.put(endpoints.admin.platform.roles.syncPermissions(uid), {
      permissions,
    });
    return res.data.data;
  },
  async getPermissions(): Promise<PlatformPermission[]> {
    const res = await axiosInstance.get(endpoints.admin.platform.permissions);
    return res.data.data ?? [];
  },
};
