'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { rolesService } from '../services/roles.service';
import type { Role } from '../types/settings.types';

const EMPTY_ROLES: Role[] = [];

type BackendPermission = {
  uid: string;
  key: string;
  action: string;
  module: string;
  description?: string;
};

function mapRoles(raw: unknown): Role[] {
  const payload = (raw as { data?: Record<string, unknown>[] }).data;
  const roles = (Array.isArray(payload) ? payload : []) as Record<string, unknown>[];
  return roles.map((role) => ({
    uid: role.uid as string,
    name: role.name as string,
    key: role.key as string,
    description: (role.description as string) ?? '',
    total_users: role.total_users as number | undefined,
    permission_uids:
      (role.permission_uids as string[] | undefined) ??
      (role.permissions as BackendPermission[] | undefined)?.map((p) => p.uid) ??
      [],
    permission_entries: ((role.permissions as BackendPermission[] | undefined) ?? []).map((p) => ({
      key: p.key,
      action: p.action,
      description: p.description,
    })),
    is_system: (role.is_system as boolean) ?? false,
    created_at: role.created_at as string,
  }));
}

export function useRoles(filters?: { search?: string }) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const queryParams = {
    ...pagination.params,
    ...(filters?.search && { search: filters.search }),
  };

  const { data: roles = EMPTY_ROLES, isLoading } = useQuery({
    queryKey: [...queryKeys.settings.roles, queryParams],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const raw = await rolesService.getAll({
        only_active_modules: true,
        ...queryParams,
      });
      const meta = extractPaginationMeta(raw);
      const mapped = mapRoles(raw);
      pagination.setTotal(meta ? meta.total : mapped.length);
      return mapped;
    },
  });

  type RolePayload = { name: string; description: string; permission_uids: string[] };

  const createMutation = useMutation({
    mutationFn: (data: RolePayload) => rolesService.create(data),
    meta: { successMessage: 'Rol creado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.roles });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RolePayload }) => rolesService.update(id, data),
    meta: { successMessage: 'Rol actualizado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.roles });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesService.delete(id),
    meta: { successMessage: 'Rol eliminado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.roles });
    },
  });

  return {
    roles,
    isLoading,
    createRole: (data: RolePayload) => {
      createMutation.mutate(data);
      return Promise.resolve(true);
    },
    updateRole: (id: string, data: RolePayload) => {
      updateMutation.mutate({ id, data });
      return Promise.resolve(true);
    },
    deleteRole: (id: string) => deleteMutation.mutateAsync(id),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}

export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.rbac.permissions,
    queryFn: () => rolesService.getPermissions(),
    staleTime: 0,
  });
}
