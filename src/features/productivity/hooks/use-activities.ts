'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { productivityService } from '../services/productivity.service';
import type { Activity, ActivityPayload, ActivityStatus } from '../types/productivity.types';

function normalizeActivity(raw: Record<string, unknown>): Activity {
  return {
    uid: raw.uid as string,
    contact_uid: raw.contact_uid as string | undefined,
    contact_name: (raw.contact_name as string) || undefined,
    type: raw.type as Activity['type'],
    title: raw.title as string,
    description: raw.description as string | undefined,
    status: raw.status as ActivityStatus,
    due_date: (raw.scheduled_at as string) ?? (raw.due_date as string) ?? '',
    assigned_to_uid: raw.assigned_to_uid as string | undefined,
    assigned_to_name: (raw.assigned_to_name as string) ?? (raw.owner_user_name as string) ?? '',
    source: raw.source as Activity['source'],
    source_uid: raw.source_uid as string | undefined,
    source_path: raw.source_path as string | undefined,
    source_label: raw.source_label as string | undefined,
    created_at: raw.created_at as string | undefined,
    updated_at: raw.updated_at as string | undefined,
  };
}

export function useActivities(
  contactUid?: string,
  filters?: { status?: string; search?: string },
  entityType?: 'contact' | 'account'
) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const queryKey = contactUid
    ? queryKeys.productivity.activities.byContact(contactUid)
    : queryKeys.productivity.activities.all;

  const serverParams = {
    ...pagination.params,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search ? { search: filters.search } : {}),
  };

  const { data: activities = [], isLoading } = useQuery({
    queryKey: [...queryKey, serverParams],
    queryFn: async () => {
      const res = await productivityService.listActivities(contactUid, serverParams, entityType);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      const raw = ((res as unknown as { data?: Record<string, unknown>[] }).data ?? []) as Record<
        string,
        unknown
      >[];
      return raw.map(normalizeActivity);
    },
  });

  const addActivity = async (payload: ActivityPayload): Promise<boolean> => {
    try {
      await productivityService.createActivity(payload);
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch {
      return false;
    }
  };

  const updateStatus = async (uid: string, status: ActivityStatus): Promise<boolean> => {
    try {
      await productivityService.updateActivityStatus(uid, status);
      queryClient.invalidateQueries({ queryKey });
      return true;
    } catch {
      return false;
    }
  };

  return {
    data: activities,
    isLoading,
    addActivity,
    updateStatus,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
