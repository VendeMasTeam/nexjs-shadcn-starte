import type { PlatformUser, PlatformUserPayload } from 'src/features/admin/types/admin.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

export const platformUsersService = {
  async getAll(params?: PaginationParams): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.admin.platform.users.list, { params });
    return res.data;
  },
  async getById(uid: string): Promise<PlatformUser> {
    const res = await axiosInstance.get(endpoints.admin.platform.users.show(uid));
    return res.data.data;
  },
  async create(data: PlatformUserPayload): Promise<PlatformUser> {
    const res = await axiosInstance.post(endpoints.admin.platform.users.create, data);
    return res.data.data;
  },
  async update(uid: string, data: Partial<PlatformUserPayload>): Promise<PlatformUser> {
    const res = await axiosInstance.put(endpoints.admin.platform.users.update(uid), data);
    return res.data.data;
  },
  async assignRole(uid: string, roleUid: string): Promise<PlatformUser> {
    const res = await axiosInstance.post(endpoints.admin.platform.users.assignRole(uid), {
      role_uid: roleUid,
    });
    return res.data.data;
  },
  async removeRole(uid: string, roleUid: string): Promise<PlatformUser> {
    const res = await axiosInstance.delete(endpoints.admin.platform.users.removeRole(uid, roleUid));
    return res.data.data;
  },
  async resetTwoFactor(uid: string): Promise<{ uid: string; two_factor_enabled: boolean }> {
    const res = await axiosInstance.post(endpoints.admin.platform.users.resetTwoFactor(uid));
    return res.data.data;
  },
  // POST .../lock — desactiva: bloquea + revoca tokens, no borra datos
  async lock(uid: string): Promise<PlatformUser> {
    const res = await axiosInstance.post(endpoints.admin.platform.users.lock(uid));
    return res.data.data;
  },
  // POST .../unlock — reactiva y reinicia intentos fallidos
  async unlock(uid: string): Promise<PlatformUser> {
    const res = await axiosInstance.post(endpoints.admin.platform.users.unlock(uid));
    return res.data.data;
  },
  // DELETE .../purge — borrado físico e irreversible, requiere admin.tenants.purge
  async purge(uid: string, confirmation: string): Promise<unknown> {
    const res = await axiosInstance.delete(endpoints.admin.platform.users.purge(uid), {
      data: { confirmation },
    });
    return res.data.data;
  },
};
