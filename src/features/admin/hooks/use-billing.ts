'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { billingService } from 'src/features/admin/services/billing.service';
import { BillingFilters, BillingSummary, Factura } from 'src/features/admin/types/admin.types';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

export function useBilling(filters: Omit<BillingFilters, 'page' | 'per_page'> = {}) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pagination = usePaginationParams();
  const { params, setTotal } = pagination;
  const summaryFetched = useRef(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await billingService.getSummary();
      setSummary(data);
      summaryFetched.current = true;
    } catch {
      // summary is non-critical
    }
  }, []);

  const fetchFacturas = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams: BillingFilters = {
        page: params.page,
        per_page: params.per_page,
        ...(filters.estado && { estado: filters.estado }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
        ...(filters.search && { search: filters.search }),
        ...(filters.plan_uid && { plan_uid: filters.plan_uid }),
      };
      const res = await billingService.getAll(queryParams);
      const meta = extractPaginationMeta(res);
      if (meta) setTotal(meta.total);
      const data = ((res as { data?: Factura[] }).data ?? []) as Factura[];
      setFacturas(data);
    } finally {
      setIsLoading(false);
    }
  }, [
    params.page,
    params.per_page,
    filters.estado,
    filters.from,
    filters.to,
    filters.search,
    filters.plan_uid,
    setTotal,
  ]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  useEffect(() => {
    if (!summaryFetched.current) fetchSummary();
  }, [fetchSummary]);

  const marcarPagada = useCallback(
    async (uid: string) => {
      await billingService.marcarPagada(uid);
      await fetchFacturas();
      await fetchSummary();
    },
    [fetchFacturas, fetchSummary]
  );

  const marcarPagadas = useCallback(
    async (uids: string[]) => {
      await billingService.marcarPagadas(uids);
      await fetchFacturas();
      await fetchSummary();
    },
    [fetchFacturas, fetchSummary]
  );

  return {
    facturas,
    summary,
    isLoading,
    refetch: fetchFacturas,
    marcarPagada,
    marcarPagadas,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
