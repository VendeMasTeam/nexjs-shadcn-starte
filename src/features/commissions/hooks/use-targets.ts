'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { commissionService } from '../services/commission.service';
import type { CommissionTarget, CreateTargetPayload } from '../types/commissions.types';

export type UpdateTargetPayload = Partial<CreateTargetPayload>;

export const useTargets = () => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const {
    data: targets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.targets, pagination.params],
    queryFn: async () => {
      const res = await commissionService.targets.list(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionTarget[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTargetPayload) => commissionService.targets.create(data),
    meta: { successMessage: 'Meta creada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.targets });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateTargetPayload }) =>
      commissionService.targets.update(uid, data),
    meta: { successMessage: 'Meta actualizada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.targets });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => commissionService.targets.remove(uid),
    meta: { successMessage: 'Meta eliminada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.targets });
    },
  });

  return {
    targets,
    isLoading,
    isError,
    isSubmitting: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    fetchTargets: refetch,
    createTarget: async (data: CreateTargetPayload) => {
      return await createMutation.mutateAsync(data);
    },
    updateTarget: async (uid: string, data: UpdateTargetPayload) => {
      return await updateMutation.mutateAsync({ uid, data });
    },
    deleteTarget: async (uid: string) => {
      await deleteMutation.mutateAsync(uid);
    },
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
};
