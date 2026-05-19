'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryStockService } from 'src/features/inventory/services/inventory-stock.service';
import type {
  AdjustStockPayload,
  InventoryMovement,
  TransferStockPayload,
} from 'src/features/inventory/types/inventory.types';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

export function useMovements(filters?: {
  product_uid?: string;
  warehouse_uid?: string;
  type?: string;
  search?: string;
}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [...queryKeys.inventory.movements, filters, pagination.params],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const result = await inventoryStockService.movements({ ...filters, ...pagination.params });
      const meta = extractPaginationMeta(result);
      if (meta) pagination.setTotal(meta.total);
      return ((result as unknown as { data?: InventoryMovement[] }).data ??
        []) as InventoryMovement[];
    },
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.inventory.movementsSummary,
    staleTime: 0,
    queryFn: () => inventoryStockService.movementsSummary(),
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) => inventoryStockService.adjust(payload),
    meta: { successMessage: 'Stock ajustado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsSummary });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (payload: TransferStockPayload) => inventoryStockService.transfer(payload),
    meta: { successMessage: 'Traslado realizado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsSummary });
    },
  });

  return {
    items,
    summary,
    isLoading,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsSummary });
    },
    adjust: (payload: AdjustStockPayload) => adjustMutation.mutateAsync(payload),
    transfer: (payload: TransferStockPayload) => transferMutation.mutateAsync(payload),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
