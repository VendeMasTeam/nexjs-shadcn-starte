'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { tagsService } from '../services/tags.service';
import type { Tag, TagForm } from '../types/tags.types';

export const useTags = (filters?: { search?: string }) => {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const queryParams = {
    ...pagination.params,
    ...(filters?.search && { search: filters.search }),
  };

  const { data: tags = [], isLoading } = useQuery({
    queryKey: [...queryKeys.settings.tags, queryParams],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await tagsService.getAll(queryParams);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      return (res as unknown as { data?: Tag[] }).data ?? ([] as Tag[]);
    },
  });

  const createMutation = useMutation({
    mutationFn: (form: TagForm) => tagsService.create(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.tags }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<TagForm> }) =>
      tagsService.update(id, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.tags }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.tags }),
  });

  return {
    tags,
    isLoading,
    createTag: async (form: TagForm) => {
      await createMutation.mutateAsync(form);
      return true;
    },
    updateTag: async (id: string, form: Partial<TagForm>) => {
      await updateMutation.mutateAsync({ id, form });
      return true;
    },
    deleteTag: async (id: string) => {
      await deleteMutation.mutateAsync(id);
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
};
