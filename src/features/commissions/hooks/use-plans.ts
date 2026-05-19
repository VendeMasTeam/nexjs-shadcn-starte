'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import {
  type CreatePlanPayload,
  plansService,
  type UpdatePlanPayload,
} from '../services/plans.service';
import type { CommissionPlan } from '../types/commissions.types';

export const usePlans = (filters: { search?: string } = {}) => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const filterParams = {
    ...(filters.search ? { search: filters.search } : {}),
  };

  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.plans, pagination.params, filterParams],
    queryFn: async () => {
      const res = await plansService.getPlans({ ...pagination.params, ...filterParams });
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionPlan[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePlanPayload) => plansService.createPlan(data),
    meta: { successMessage: 'Plan creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.plans });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdatePlanPayload }) =>
      plansService.updatePlan(uid, data),
    meta: { successMessage: 'Plan actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.plans });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => plansService.deletePlan(uid),
    meta: { successMessage: 'Plan eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.plans });
    },
  });

  return {
    plans,
    isLoading,
    isError,
    isSubmitting: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    fetchPlans: refetch,
    createPlan: async (data: CreatePlanPayload): Promise<CommissionPlan> => {
      return await createMutation.mutateAsync(data);
    },
    updatePlan: async (uid: string, data: UpdatePlanPayload): Promise<CommissionPlan> => {
      return await updateMutation.mutateAsync({ uid, data });
    },
    deletePlan: async (uid: string): Promise<void> => {
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
