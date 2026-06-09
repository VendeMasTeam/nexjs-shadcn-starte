'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryWarehouseService } from 'src/features/inventory/services/inventory-warehouse.service';
import type {
  CreateWarehousePayload,
  Warehouse,
  WarehouseListSummary,
} from 'src/features/inventory/types/inventory.types';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

export function useWarehouses(filters?: {
  search?: string;
  has_stock?: boolean;
  per_page?: number;
}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { per_page, ...restFilters } = filters ?? {};
  const paginationParams = per_page ? { ...pagination.params, per_page } : pagination.params;

  const { data: result } = useQuery({
    queryKey: [...queryKeys.inventory.warehouses, paginationParams, restFilters],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const raw = await inventoryWarehouseService.listRaw({ ...paginationParams, ...restFilters });
      const meta = extractPaginationMeta(raw);
      if (meta) pagination.setTotal(meta.total);
      return {
        data: (raw as Record<string, unknown>).data as Warehouse[],
        summary: (raw as Record<string, unknown>).summary as WarehouseListSummary,
      };
    },
  });

  const items: Warehouse[] = result?.data ?? [];
  const summary: WarehouseListSummary | undefined = result?.summary;
  const isLoading = !result;

  const createMutation = useMutation({
    mutationFn: (payload: CreateWarehousePayload) => inventoryWarehouseService.create(payload),
    meta: { successMessage: 'Bodega creada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.warehouses });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<CreateWarehousePayload> }) =>
      inventoryWarehouseService.update(uid, payload),
    meta: { successMessage: 'Bodega actualizada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.warehouses });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid: string) => inventoryWarehouseService.remove(uid),
    meta: { successMessage: 'Bodega eliminada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.warehouses });
    },
  });

  return {
    items,
    summary,
    isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.warehouses }),
    createWarehouse: (payload: CreateWarehousePayload) => createMutation.mutateAsync(payload),
    updateWarehouse: (uid: string, payload: Partial<CreateWarehousePayload>) =>
      updateMutation.mutateAsync({ uid, payload }),
    removeWarehouse: (uid: string) => removeMutation.mutateAsync(uid),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
