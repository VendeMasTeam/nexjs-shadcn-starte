'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { currencyService } from '../services/currency.service';
import type { CurrencyRate } from '../types/sales.types';

// TODO: replace local state with optimistic updates via useMutation.
// The isDirty+localRates pattern duplicates TanStack Query cache.
export function useCurrencyRates() {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const {
    data: fetched = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.sales.currencyRates, pagination.params],
    queryFn: async () => {
      const res = await currencyService.getRates(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CurrencyRate[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [localRates, setLocalRates] = useState<CurrencyRate[]>([]);

  const rates = useMemo(() => (isDirty ? localRates : fetched), [isDirty, localRates, fetched]);

  const setRates = useCallback((next: CurrencyRate[]) => {
    setIsDirty(true);
    setLocalRates(next);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (rate: { from_currency: string; to_currency: string; rate: number }) =>
      currencyService.upsertRate(rate),
    meta: { successMessage: 'Tasas guardadas' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.currencyRates });
      setIsDirty(false);
    },
  });

  const saveRate = useCallback(
    (code: string, rate: number) => {
      saveMutation.mutate({ from_currency: 'USD', to_currency: code, rate });
    },
    [saveMutation]
  );

  return {
    rates,
    setRates,
    saveRate,
    isSaving: saveMutation.isPending,
    isLoading,
    error: error ?? null,
    refresh: refetch,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
