'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryStockService } from 'src/features/inventory/services/inventory-stock.service';
import type { InventoryCategory } from 'src/features/inventory/types/inventory.types';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

const EMPTY: InventoryCategory[] = [];

export function useCategories(filters?: { search?: string; per_page?: number }) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: categories = EMPTY, isLoading } = useQuery({
    queryKey: [...queryKeys.inventory.categories, filters, pagination.params],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = {
        ...pagination.params,
        ...(filters?.search !== undefined && { search: filters.search }),
        ...(filters?.per_page !== undefined && { per_page: filters.per_page }),
      };
      const res = await inventoryStockService.categories(params);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as InventoryCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      inventoryStockService.createCategory(payload),
    meta: { successMessage: 'Categoría creada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.categories });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({
      uid,
      payload,
    }: {
      uid: string;
      payload: { name?: string; description?: string };
    }) => inventoryStockService.updateCategory(uid, payload),
    meta: { successMessage: 'Categoría actualizada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.categories });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (uid: string) => inventoryStockService.deleteCategory(uid),
    meta: { successMessage: 'Categoría eliminada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.categories });
    },
  });

  return {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
