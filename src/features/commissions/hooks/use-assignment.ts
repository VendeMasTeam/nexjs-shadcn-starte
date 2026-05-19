'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import {
  assignmentService,
  type CreateAssignmentPayload,
  type UpdateAssignmentPayload,
} from '../services/assignment.service';
import type { CommissionAssignment } from '../types/commissions.types';

export const useAssignment = (filters: { search?: string; team_uid?: string } = {}) => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const filterParams = {
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.team_uid ? { team_uid: filters.team_uid } : {}),
  };

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...queryKeys.commissions.assignments, pagination.params, filterParams],
    queryFn: async () => {
      const res = await assignmentService.getAssignments({ ...pagination.params, ...filterParams });
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as CommissionAssignment[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAssignmentPayload) => assignmentService.createAssignment(data),
    meta: { successMessage: 'Asignación creada exitosamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.assignments });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateAssignmentPayload }) =>
      assignmentService.updateAssignment(uid, data),
    meta: { successMessage: 'Asignación actualizada exitosamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.assignments });
    },
  });

  return {
    assignments,
    isLoading,
    isError,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    fetchAssignments: refetch,
    createAssignment: async (data: CreateAssignmentPayload): Promise<CommissionAssignment> => {
      return await createMutation.mutateAsync(data);
    },
    updateAssignment: async (
      uid: string,
      data: UpdateAssignmentPayload
    ): Promise<CommissionAssignment> => {
      return await updateMutation.mutateAsync({ uid, data });
    },
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
};
