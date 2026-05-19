'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { commissionService } from '../services/commission.service';
import type {
  CommissionRule,
  CreateRulePayload,
  UpdateRulePayload,
} from '../types/commissions.types';

export const useRules = () => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const {
    data: rules = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.rules, pagination.params],
    queryFn: async () => {
      const res = await commissionService.rules.list(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionRule[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateRulePayload) => commissionService.rules.create(data),
    meta: { successMessage: 'Regla creada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.rules });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateRulePayload }) =>
      commissionService.rules.update(uid, data),
    meta: { successMessage: 'Regla actualizada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.rules });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => commissionService.rules.remove(uid),
    meta: { successMessage: 'Regla eliminada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.rules });
    },
  });

  return {
    rules,
    isLoading,
    isError,
    isSubmitting: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    fetchRules: refetch,
    createRule: async (data: CreateRulePayload) => {
      return await createMutation.mutateAsync(data);
    },
    updateRule: async (uid: string, data: UpdateRulePayload) => {
      return await updateMutation.mutateAsync({ uid, data });
    },
    deleteRule: async (uid: string) => {
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
