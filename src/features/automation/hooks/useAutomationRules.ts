'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { automationService } from '../services/automation.service';
import type { AutomationRule } from '../types';

export function useAutomationRules() {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: [...queryKeys.automation.rules, pagination.params],
    queryFn: async () => {
      const res = await automationService.getAll(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as AutomationRule[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // Trigger events from backend (replaces hardcoded types)
  const { data: triggerEventsData } = useQuery({
    queryKey: [...queryKeys.automation.rules, 'trigger-events'],
    queryFn: () => automationService.getTriggerEvents(),
    staleTime: 0,
  });

  const stats = useMemo(
    () => ({
      activeCount: rules.filter((r) => r.is_active).length,
      inactiveCount: rules.filter((r) => !r.is_active).length,
      totalRuns: rules.reduce((sum, r) => sum + r.execution_count, 0),
      lastRun: rules
        .filter((r) => r.last_executed_at)
        .sort(
          (a, b) =>
            new Date(b.last_executed_at!).getTime() - new Date(a.last_executed_at!).getTime()
        )[0]?.last_executed_at,
    }),
    [rules]
  );

  const createMutation = useMutation({
    mutationFn: (
      data: Omit<AutomationRule, 'uid' | 'created_at' | 'execution_count' | 'last_executed_at'>
    ) => automationService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.automation.rules }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<AutomationRule> }) =>
      automationService.update(uid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.automation.rules }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => automationService.delete(uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.automation.rules }),
  });

  const toggleMutation = useMutation({
    mutationFn: (uid: string) => automationService.toggleRule(uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.automation.rules }),
  });

  return {
    rules,
    isLoading,
    stats,
    triggerEvents: triggerEventsData as Record<string, unknown> | undefined,
    createRule: async (
      data: Omit<AutomationRule, 'uid' | 'created_at' | 'execution_count' | 'last_executed_at'>
    ): Promise<boolean> => {
      await createMutation.mutateAsync(data);
      return true;
    },
    updateRule: async (uid: string, data: Partial<AutomationRule>): Promise<boolean> => {
      await updateMutation.mutateAsync({ uid, data });
      return true;
    },
    deleteRule: async (uid: string): Promise<void> => {
      await deleteMutation.mutateAsync(uid);
    },
    toggleRule: async (uid: string): Promise<boolean> => {
      await toggleMutation.mutateAsync(uid);
      return true;
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
