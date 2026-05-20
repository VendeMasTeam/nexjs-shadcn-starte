'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { platformRolesService } from '../services/platform-roles.service';
import type { PlatformPermission, PlatformRole, PlatformRolePayload } from '../types/admin.types';

const EMPTY_ROLES: PlatformRole[] = [];
const EMPTY_PERMISSIONS: PlatformPermission[] = [];

export function usePlatformRoles() {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: rawData, isLoading } = useQuery({
    queryKey: [...queryKeys.admin.platformRoles, pagination.params],
    queryFn: async () => {
      const res = await platformRolesService.getAll(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return res;
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const roles: PlatformRole[] =
    ((rawData as Record<string, unknown>)?.data as PlatformRole[]) ?? EMPTY_ROLES;

  const { data: permissions = EMPTY_PERMISSIONS } = useQuery({
    queryKey: queryKeys.admin.platformPermissions,
    queryFn: () => platformRolesService.getPermissions(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: PlatformRolePayload) => platformRolesService.create(data),
    meta: { successMessage: 'Rol creado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformRoles }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<PlatformRolePayload> }) =>
      platformRolesService.update(uid, data),
    meta: { successMessage: 'Rol actualizado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformRoles }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => platformRolesService.delete(uid),
    meta: { successMessage: 'Rol eliminado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformRoles }),
  });

  return {
    roles,
    permissions,
    isLoading,
    createRole: async (data: PlatformRolePayload): Promise<void> => {
      await createMutation.mutateAsync(data);
    },
    updateRole: async (uid: string, data: Partial<PlatformRolePayload>): Promise<void> => {
      await updateMutation.mutateAsync({ uid, data });
    },
    deleteRole: async (uid: string): Promise<void> => {
      await deleteMutation.mutateAsync(uid);
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
