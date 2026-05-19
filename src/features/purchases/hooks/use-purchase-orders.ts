'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import {
  type ListPurchaseOrdersParams,
  purchaseOrderService,
} from '../services/purchase-order.service';
import type { PurchaseOrderPayload } from '../types/purchase-order.types';

const QUERY_KEY = ['purchases', 'orders'] as const;

export interface UsePurchaseOrdersParams {
  /** Server-side status filter.
   *  Backend now supports both search and status on GET /purchases/orders */
  status?: string;
}

export function usePurchaseOrders(params?: UsePurchaseOrdersParams) {
  const qc = useQueryClient();
  const pagination = usePaginationParams();

  // Server-side params: page, per_page, search (backend-supported), and optional status filter.
  const serverParams = {
    page: pagination.page,
    per_page: pagination.rowsPerPage,
    ...(pagination.search ? { search: pagination.search } : {}),
    ...(params?.status ? { status: params.status } : {}),
  } as const;

  const { data = [], isLoading } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: async () => {
      const res = await purchaseOrderService.list(serverParams as ListPurchaseOrdersParams);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return (res.data ?? []) as import('../types/purchase-order.types').PurchaseOrder[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const create = useMutation({
    mutationFn: (p: PurchaseOrderPayload) => purchaseOrderService.create(p),
    meta: { successMessage: 'OC creada' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  const update = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<PurchaseOrderPayload> }) =>
      purchaseOrderService.update(uid, payload),
    meta: { successMessage: 'OC actualizada' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  const approve = useMutation({
    mutationFn: (uid: string) => purchaseOrderService.approve(uid),
    meta: { successMessage: 'OC aprobada' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  const receive = useMutation({
    mutationFn: (uid: string) => purchaseOrderService.markReceived(uid),
    meta: { successMessage: 'OC recibida' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  return {
    orders: data,
    isLoading,
    createOrder: create,
    updateOrder: update,
    approveOrder: approve,
    receiveOrder: receive,
    /** Pagination state from backend (server-side). */
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
    /** Search term sent to backend (server-side). */
    search: pagination.search ?? '',
    onChangeSearch: pagination.onChangeSearch,
    status: params?.status ?? 'all',
  };
}
