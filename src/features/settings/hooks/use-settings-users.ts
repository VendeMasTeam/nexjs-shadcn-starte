'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { usersService } from '../services/users.service';
import type { SettingsUser } from '../types/settings.types';

const EMPTY_USERS: SettingsUser[] = [];

const generatePassword = () => Math.random().toString(36).slice(-10) + 'A1!';

// ─── Business logic moved from users.service ───────────────────────────────

const deriveStatus = (raw: Record<string, unknown>): SettingsUser['status'] =>
  raw.locked_until && new Date(raw.locked_until as string) > new Date() ? 'INACTIVO' : 'ACTIVO';

const extractPayload = (res: unknown): Record<string, unknown> =>
  ((res as Record<string, unknown>)?.data ?? res) as Record<string, unknown>;

// ─── Filters ────────────────────────────────────────────────────────────────

interface UserFilters {
  search?: string;
  role_uid?: string;
  estado?: string;
}

export function useSettingsUsers(filters: UserFilters = {}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const queryParams = {
    ...pagination.params,
    ...(filters.search && { search: filters.search }),
    ...(filters.role_uid && { role_uid: filters.role_uid }),
    ...(filters.estado && { estado: filters.estado }),
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: [...queryKeys.settings.users, queryParams],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await usersService.getAll(queryParams);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return res;
    },
  });

  const users: SettingsUser[] = ((rawData as unknown as { data?: SettingsUser[] })?.data ??
    EMPTY_USERS) as SettingsUser[];

  const createMutation = useMutation({
    meta: { successMessage: 'Usuario creado' },
    mutationFn: async (
      data: Omit<SettingsUser, 'uid' | 'created_at' | 'last_login_at'> & {
        password?: string;
        role_uid?: string;
      }
    ) => {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password || generatePassword(),
        status: data.status,
      };
      const res = await usersService.create(payload);
      const raw = extractPayload(res);
      const newUser = { ...raw, status: deriveStatus(raw) } as SettingsUser;
      if (data.role_uid) {
        await usersService.assignRole(newUser.uid, data.role_uid as string).catch(() => {});
      }
      return newUser;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.users }),
  });

  const updateMutation = useMutation({
    meta: { successMessage: 'Usuario actualizado' },
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SettingsUser> & { role_uid?: string };
    }) => {
      const payload = {
        name: data.name,
        email: data.email,
        status: data.status,
      };
      await usersService.update(id, payload);
      if (data.role_uid !== undefined) {
        const oldUser = users.find((u) => u.uid === id);
        if (oldUser?.role_uid && oldUser.role_uid !== data.role_uid) {
          await usersService.removeRole(id, oldUser.role_uid).catch(() => {});
        }
        if (data.role_uid) {
          await usersService.assignRole(id, data.role_uid).catch(() => {});
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.users }),
  });

  const toggleStatusMutation = useMutation({
    meta: { successMessage: 'Estado actualizado' },
    mutationFn: async (id: string) => {
      const user = users.find((u) => u.uid === id);
      if (!user) throw new Error('Usuario no encontrado');
      const isActive = user.status !== 'ACTIVO';
      await usersService.toggleStatus(id, isActive);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.users }),
  });

  const deleteMutation = useMutation({
    meta: { successMessage: 'Usuario eliminado' },
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.users }),
  });

  return {
    users,
    isLoading,
    createUser: async (
      data: Omit<SettingsUser, 'uid' | 'created_at' | 'last_login_at'> & {
        password?: string;
        role_uid?: string;
      }
    ): Promise<boolean> => {
      try {
        await createMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    updateUser: async (
      id: string,
      data: Partial<SettingsUser> & { role_uid?: string }
    ): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ id, data });
        return true;
      } catch {
        return false;
      }
    },
    toggleStatus: async (id: string): Promise<void> => {
      await toggleStatusMutation.mutateAsync(id);
    },
    deleteUser: async (id: string): Promise<void> => {
      await deleteMutation.mutateAsync(id);
    },
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.users }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}

export function useUser(uid?: string) {
  return useQuery<SettingsUser>({
    queryKey: ['user', uid] as const,
    queryFn: async () => {
      const res = await usersService.getById(uid!);
      const raw = extractPayload(res);
      return { ...raw, status: deriveStatus(raw) } as SettingsUser;
    },
    enabled: !!uid,
  });
}
