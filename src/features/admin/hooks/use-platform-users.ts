'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { platformUsersService } from '../services/platform-users.service';
import type { PlatformUser, PlatformUserPayload } from '../types/admin.types';

const EMPTY_USERS: PlatformUser[] = [];

interface PlatformUserFilters {
  role_uid?: string;
  status?: string;
}

export function usePlatformUsers(filters: PlatformUserFilters = {}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const queryParams = {
    ...pagination.params,
    ...(filters.role_uid && { role_uid: filters.role_uid }),
    ...(filters.status && { status: filters.status }),
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.platformUsers, queryParams],
    queryFn: async () => {
      const res = await platformUsersService.getAll(queryParams);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return res;
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const users: PlatformUser[] =
    ((rawData as Record<string, unknown>)?.data as PlatformUser[]) ?? EMPTY_USERS;

  const createMutation = useMutation({
    mutationFn: (data: PlatformUserPayload) => platformUsersService.create(data),
    meta: { successMessage: 'Usuario creado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformUsers }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<PlatformUserPayload> }) =>
      platformUsersService.update(uid, data),
    meta: { successMessage: 'Usuario actualizado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformUsers }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => platformUsersService.delete(uid),
    meta: { successMessage: 'Usuario eliminado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformUsers }),
  });

  const lockMutation = useMutation({
    mutationFn: (uid: string) => platformUsersService.lock(uid),
    meta: { successMessage: 'Usuario bloqueado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformUsers }),
  });

  const unlockMutation = useMutation({
    mutationFn: (uid: string) => platformUsersService.unlock(uid),
    meta: { successMessage: 'Usuario desbloqueado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformUsers }),
  });

  return {
    users,
    isLoading,
    createUser: async (data: PlatformUserPayload): Promise<void> => {
      await createMutation.mutateAsync(data);
    },
    updateUser: async (uid: string, data: Partial<PlatformUserPayload>): Promise<void> => {
      await updateMutation.mutateAsync({ uid, data });
    },
    deleteUser: async (uid: string): Promise<void> => {
      await deleteMutation.mutateAsync(uid);
    },
    lockUser: async (uid: string): Promise<void> => {
      await lockMutation.mutateAsync(uid);
    },
    unlockUser: async (uid: string): Promise<void> => {
      await unlockMutation.mutateAsync(uid);
    },
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      search: pagination.params.search,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
      onChangeSearch: pagination.onChangeSearch,
    },
  };
}
