'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { segmentsService } from '../services/segments.service';
import type { Segment, SegmentPayload } from '../types/segments.types';

function normalizeSegment(raw: Record<string, unknown>): Segment {
  return {
    uid: raw.uid as string,
    name: raw.name as string,
    description: (raw.description as string) ?? '',
    logic: ((raw.logic as string)?.toUpperCase() === 'OR' ? 'OR' : 'AND') as 'AND' | 'OR',
    rules: ((raw.rules as Record<string, unknown>[]) ?? []).map((r) => ({
      uid: r.uid as string,
      field: r.field as string,
      operator: r.operator as string,
      value: r.value as string | number | string[],
    })),
    total_contacts: (raw.total_contacts as number) ?? (raw.totalContacts as number) ?? 0,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

export function useSegments() {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: segments = [], isLoading } = useQuery({
    queryKey: [...queryKeys.contacts.segments.list, pagination.params],
    queryFn: async () => {
      const res = await segmentsService.list(pagination.params);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      const raw = (res as unknown as { data?: Record<string, unknown>[] }).data ?? [];
      return raw.map(normalizeSegment);
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: SegmentPayload) => segmentsService.create(payload),
    meta: { successMessage: 'Segmento creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.segments.list });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<SegmentPayload> }) =>
      segmentsService.update(uid, payload),
    meta: { successMessage: 'Segmento actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.segments.list });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => segmentsService.remove(uid),
    meta: { successMessage: 'Segmento eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.segments.list });
    },
  });

  const createSegment = async (payload: SegmentPayload): Promise<boolean> => {
    await createMutation.mutateAsync(payload);
    return true;
  };

  const updateSegment = async (uid: string, payload: Partial<SegmentPayload>): Promise<boolean> => {
    await updateMutation.mutateAsync({ uid, payload });
    return true;
  };

  const deleteSegment = async (uid: string): Promise<boolean> => {
    await deleteMutation.mutateAsync(uid);
    return true;
  };

  return {
    segments,
    isLoading,
    createSegment,
    updateSegment,
    deleteSegment,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.contacts.segments.list }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
