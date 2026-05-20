'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { customFieldsService } from '../services/custom-fields.service';
import type { CustomField, CustomFieldModule } from '../types/settings.types';

export interface ModuleTotals {
  contacts: number;
  companies: number;
  opportunities: number;
  products: number;
}

interface CustomFieldFilters {
  module?: CustomFieldModule | 'ALL';
  search?: string;
}

export function useCustomFields(filters: CustomFieldFilters = {}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();
  const [moduleTotals, setModuleTotals] = useState<ModuleTotals | null>(null);

  const moduleFilter = filters.module && filters.module !== 'ALL' ? filters.module : undefined;

  const queryParams = {
    ...pagination.params,
    ...(filters.search && { search: filters.search }),
    ...(moduleFilter ? { module: moduleFilter } : {}),
  };

  const { data: fields = [], isLoading } = useQuery({
    queryKey: [...queryKeys.settings.customFields, queryParams],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await customFieldsService.getAll(queryParams);
      const raw = res as Record<string, unknown>;
      // Backend may return { items, totals } inside data OR data as array with totals in meta
      const data = raw;
      const items = (data.items ?? data.data ?? []) as CustomField[];
      const totals = (data.totals ?? (data.meta as Record<string, unknown> | undefined)?.totals) as
        | ModuleTotals
        | undefined;
      if (totals) setModuleTotals(totals);
      const meta = extractPaginationMeta(raw);
      if (meta) pagination.setTotal(meta.total);
      return items;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CustomField, 'uid' | 'created_at'>) => customFieldsService.create(data),
    meta: { successMessage: 'Campo personalizado creado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.customFields }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<CustomField> }) =>
      customFieldsService.update(uid, data),
    meta: { successMessage: 'Campo personalizado actualizado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.customFields }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => customFieldsService.delete(uid),
    meta: { successMessage: 'Campo personalizado eliminado' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.customFields }),
  });

  return {
    fields,
    isLoading,
    moduleTotals,
    createField: async (data: Omit<CustomField, 'uid' | 'created_at'>): Promise<boolean> => {
      await createMutation.mutateAsync(data);
      return true;
    },
    updateField: async (uid: string, data: Partial<CustomField>): Promise<boolean> => {
      await updateMutation.mutateAsync({ uid, data });
      return true;
    },
    deleteField: async (uid: string): Promise<void> => {
      await deleteMutation.mutateAsync(uid);
    },
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
