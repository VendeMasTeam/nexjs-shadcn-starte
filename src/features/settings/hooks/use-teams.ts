'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { teamsService } from '../services/teams.service';
import type { Team } from '../types/settings.types';

const EMPTY: Team[] = [];

export function useTeams(search = '') {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const { data: teams = EMPTY, isLoading } = useQuery({
    queryKey: [...queryKeys.settings.teams, search, pagination.params],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await teamsService.getAll({ search: search || undefined, ...pagination.params });
      const meta = extractPaginationMeta(res);
      const items = ((res as Record<string, unknown>)?.data ?? res) as Team[];
      const teamArray = Array.isArray(items) ? items : [];
      pagination.setTotal(meta ? meta.total : teamArray.length);
      return teamArray;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Team, 'uid' | 'created_at' | 'members_count' | 'members'>) =>
      teamsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.teams }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<Team> }) =>
      teamsService.update(uid, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.teams }),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ uid, userUid }: { uid: string; userUid: string }) =>
      teamsService.addMember(uid, userUid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.teams }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ uid, userUid }: { uid: string; userUid: string }) =>
      teamsService.removeMember(uid, userUid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.teams }),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => teamsService.delete(uid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.teams }),
  });

  return {
    teams,
    isLoading,
    createTeam: async (
      data: Omit<Team, 'uid' | 'created_at' | 'members_count' | 'members'>
    ): Promise<boolean> => {
      await createMutation.mutateAsync(data);
      return true;
    },
    updateTeam: async (uid: string, data: Partial<Team>): Promise<boolean> => {
      await updateMutation.mutateAsync({ uid, data });
      return true;
    },
    addMember: async (uid: string, userUid: string): Promise<void> => {
      await addMemberMutation.mutateAsync({ uid, userUid });
    },
    removeMember: async (uid: string, userUid: string): Promise<void> => {
      await removeMemberMutation.mutateAsync({ uid, userUid });
    },
    deleteTeam: async (uid: string): Promise<void> => {
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
