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
  async delete(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.admin.platform.users.delete(uid));
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
};
