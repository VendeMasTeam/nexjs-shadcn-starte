'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { commissionService } from '../services/commission.service';
import type { CommissionRun } from '../types/commissions.types';

interface HistoryFilters {
  status?: string;
  search?: string;
  period?: string;
}

export const useHistory = (filters: HistoryFilters = {}) => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const serverFilters = {
    ...(filters.status ? { status: filters.status.toLowerCase() } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.period ? { period: filters.period } : {}),
  };

  const {
    data: runs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.runs, pagination.params, serverFilters],
    queryFn: async () => {
      const res = await commissionService.getRuns({ ...pagination.params, ...serverFilters });
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionRun[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: (uid: string) => commissionService.approveRun(uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.runs });
    },
  });

  const payMutation = useMutation({
    mutationFn: (uid: string) =>
      commissionService.payRun(uid, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.runs });
    },
  });

  const bulkApprove = async (uids: string[]) => {
    try {
      await Promise.all(uids.map((uid) => approveMutation.mutateAsync(uid)));
      notify.success(`${uids.length} registro(s) aprobado(s)`);
    } catch {
      notify.error('Error al aprobar algunos registros');
    }
  };

  const bulkPay = async (uids: string[]) => {
    try {
      await Promise.all(uids.map((uid) => payMutation.mutateAsync(uid)));
      notify.success(`${uids.length} registro(s) marcado(s) como pagado(s)`);
    } catch {
      notify.error('Error al pagar algunos registros');
    }
  };

  return {
    runs,
    isLoading,
    isError,
    fetchRuns: refetch,
    bulkApprove,
    bulkPay,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
};

export type { CommissionRun as RegistroComision };
