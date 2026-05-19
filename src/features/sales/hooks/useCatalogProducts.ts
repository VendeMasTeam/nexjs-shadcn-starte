'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { catalogService } from '../services/catalog.service';
import type { CatalogProduct } from '../types/catalog.types';

const EMPTY: CatalogProduct[] = [];

export interface CatalogProductFilters {
  search?: string;
  type?: 'product' | 'service';
  status?: 'active' | 'inactive';
}

export function useCatalogProducts(filters?: CatalogProductFilters) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: raw, isLoading } = useQuery({
    queryKey: ['catalog', 'products', pagination.params, filters],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await catalogService.getPaginated({ ...pagination.params, ...filters });
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return res as { data?: CatalogProduct[] };
    },
  });

  return {
    items: raw?.data ?? EMPTY,
    isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
