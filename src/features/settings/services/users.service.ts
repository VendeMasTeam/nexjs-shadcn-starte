import axiosInstance, { endpoints } from 'src/lib/axios';

// ─── Thin service — only raw API calls, no business logic ──────────────────

export const usersService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await axiosInstance.get(endpoints.users.list, { params });
    return res.data;
  },

  // GET /users/{uid}
  async getById(uid: string) {
    const res = await axiosInstance.get(endpoints.users.show(uid), {
      params: { include: 'role,team' },
    });
    return res.data;
  },

  // POST /users
  async create(data: Record<string, unknown>) {
    const res = await axiosInstance.post(endpoints.users.create, data);
    return res.data;
  },

  // PUT /users/{uid}
  async update(id: string, data: Record<string, unknown>) {
    const res = await axiosInstance.put(endpoints.users.update(id), data);
    return res.data;
  },

  async toggleStatus(uid: string, isActive: boolean) {
    const res = await axiosInstance.put(endpoints.users.update(uid), {
      is_active: isActive,
    });
    return res.data;
  },

  // DELETE /users/{uid}
  async delete(id: string): Promise<void> {
    await axiosInstance.delete(endpoints.users.delete(id));
  },

  async assignRole(userId: string, roleUid: string): Promise<void> {
    await axiosInstance.post(endpoints.users.assignRole(userId), { role_uid: roleUid });
  },

  async removeRole(userId: string, roleUid: string): Promise<void> {
    await axiosInstance.delete(endpoints.users.removeRole(userId, roleUid));
  },

  async assignPermission(userId: string, permissionUid: string): Promise<void> {
    await axiosInstance.post(endpoints.users.assignPermission(userId), {
      permission_uid: permissionUid,
    });
  },

  async removePermission(userId: string, permissionUid: string): Promise<void> {
    await axiosInstance.delete(endpoints.users.removePermission(userId, permissionUid));
  },

  async getAccess(userId: string) {
    const res = await axiosInstance.get(endpoints.users.access(userId));
    return res.data;
  },

  // POST /users/{uid}/2fa/reset — requiere permiso users.manage
  async resetTwoFactor(uid: string) {
    const res = await axiosInstance.post(endpoints.users.resetTwoFactor(uid));
    return res.data;
  },
};
