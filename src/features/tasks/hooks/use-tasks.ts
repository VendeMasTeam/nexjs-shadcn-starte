'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService } from 'src/features/tasks/services/task.service';
import type { Task, TaskPayload } from 'src/features/tasks/types/task.types';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

const QUERY_KEY = ['tasks'] as const;

export function useTasks(filters?: { search?: string; status?: string }) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const serverParams = {
    ...pagination.params,
    ...(filters?.search ? { search: filters.search } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: async () => {
      const res = await taskService.list(serverParams);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return ((res as unknown as { data?: Task[] }).data ?? []) as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: (payload: TaskPayload) => taskService.create(payload),
    meta: { successMessage: 'Tarea creada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<TaskPayload> }) =>
      taskService.update(uid, payload),
    meta: { successMessage: 'Tarea actualizada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (uid: string) => taskService.delete(uid),
    meta: { successMessage: 'Tarea eliminada' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
