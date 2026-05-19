'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { assignmentService } from '../services/assignment.service';
import type { AssignmentRule } from '../types';

export function useAssignmentRules() {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: assignmentRules = [], isLoading } = useQuery({
    queryKey: [...queryKeys.automation.assignmentRules, pagination.params],
    queryFn: async () => {
      const res = await assignmentService.getAll(pagination.params);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as AssignmentRule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<AssignmentRule, 'uid' | 'created_at'>) =>
      assignmentService.create(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.assignmentRules }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<AssignmentRule> }) =>
      assignmentService.update(uid, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.assignmentRules }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => assignmentService.delete(uid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.automation.assignmentRules }),
  });

  return {
    assignmentRules,
    isLoading,
    createAssignmentRule: async (
      data: Omit<AssignmentRule, 'uid' | 'created_at'>
    ): Promise<boolean> => {
      await createMutation.mutateAsync(data);
      return true;
    },
    updateAssignmentRule: async (uid: string, data: Partial<AssignmentRule>): Promise<boolean> => {
      await updateMutation.mutateAsync({ uid, data });
      return true;
    },
    deleteAssignmentRule: async (uid: string): Promise<void> => {
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
