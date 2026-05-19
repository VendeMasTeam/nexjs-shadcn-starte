'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { commissionService } from '../services/commission.service';
import type { CommissionEntry } from '../types/commissions.types';

export const useEntries = () => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.entries, pagination.params],
    queryFn: async () => {
      const res = await commissionService.entries.list(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionEntry[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const payMutation = useMutation({
    mutationFn: (uid: string) => commissionService.entries.pay(uid),
    meta: { successMessage: 'Entrada marcada como pagada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.entries });
    },
  });

  return {
    entries,
    isLoading,
    isError,
    isSubmitting: payMutation.isPending,
    fetchEntries: refetch,
    payEntry: async (uid: string) => {
      return await payMutation.mutateAsync(uid);
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
