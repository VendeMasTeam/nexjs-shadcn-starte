'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryProductService } from 'src/features/inventory/services/inventory-product.service';
import type {
  CreateProductPayload,
  InventoryMasterItem,
  InventoryMasterResponse,
  InventoryMasterSummary,
} from 'src/features/inventory/types/inventory.types';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

const EMPTY_ITEMS: InventoryMasterItem[] = [];

export interface ProductFilters {
  category_uid?: string;
  warehouse_uid?: string;
  stock_state?: 'normal' | 'low' | 'out';
  search?: string;
  is_active?: boolean;
  per_page?: number;
}

export function useProducts(filters?: ProductFilters) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { per_page, ...restFilters } = filters ?? {};
  const paginationOverride = per_page ? { ...pagination.params, per_page } : pagination.params;

  const { data: masterData, isLoading } = useQuery({
    queryKey: [...queryKeys.inventory.products, paginationOverride, filters],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const masterRes = await inventoryProductService.master({
        ...paginationOverride,
        ...restFilters,
      });
      const meta = extractPaginationMeta(masterRes);
      if (meta) pagination.setTotal(meta.total);
      return (masterRes as unknown as { data?: InventoryMasterResponse }).data ?? null;
    },
  });

  const items = (masterData?.data ?? EMPTY_ITEMS) as InventoryMasterItem[];
  const summary: InventoryMasterSummary | undefined = masterData?.summary;

  const createProduct = useMutation({
    mutationFn: (payload: CreateProductPayload) => inventoryProductService.create(payload),
    meta: { successMessage: 'Producto creado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.products });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<CreateProductPayload> }) =>
      inventoryProductService.update(uid, payload),
    meta: { successMessage: 'Producto actualizado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.products });
    },
  });

  const removeProduct = useMutation({
    mutationFn: (uid: string) => inventoryProductService.remove(uid),
    meta: { successMessage: 'Producto eliminado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.products });
    },
  });

  return {
    items,
    summary,
    isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.products }),
    createProduct: (payload: CreateProductPayload) => createProduct.mutateAsync(payload),
    updateProduct: (uid: string, payload: Partial<CreateProductPayload>) =>
      updateProduct.mutateAsync({ uid, payload }),
    removeProduct: (uid: string) => removeProduct.mutateAsync(uid),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
