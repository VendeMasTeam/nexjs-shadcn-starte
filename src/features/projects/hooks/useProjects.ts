'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { projectsService } from '../services/projects.service';
import type {
  MilestonePayload,
  Project,
  ProjectPayload,
  ProjectResourcePayload,
  ProjectsSummary,
} from '../types';

function normalizeProject(raw: Record<string, unknown>): Project {
  return {
    uid: raw.uid as string,
    name: raw.name as string,
    client_uid: raw.client_uid as string,
    client_name: (raw.client_name as string) ?? '',
    opportunity_uid: raw.opportunity_uid as string | undefined,
    status: raw.status as Project['status'],
    start_date: (raw.start_date as string) ?? '',
    end_date: (raw.end_date as string) ?? '',
    manager: (raw.manager as string) ?? '',
    description: (raw.description as string) ?? '',
    milestones: (raw.milestones as Project['milestones']) ?? [],
    resources: (raw.resources as Project['resources']) ?? [],
    progress: (raw.progress as number) ?? 0,
    created_at: (raw.created_at as string) ?? '',
    updated_at: raw.updated_at as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseProjectsParams {
  /** Server-side status filter (backend-supported).
   *  Maps to ProjectService::getProjects() → ProjectRepository::all() status filter. */
  status?: string;
}

export function useProjects(params?: UseProjectsParams) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  // Merge external status filter with pagination params (search is already in pagination.params)
  const queryParams = {
    ...pagination.params,
    ...(params?.status ? { status: params.status } : {}),
  };

  const { data: result, isLoading } = useQuery({
    queryKey: [...queryKeys.projects.list, queryParams],
    queryFn: async () => {
      const res = await projectsService.list(queryParams);
      const meta = extractPaginationMeta(res);
      if (meta) pagination.setTotal(meta.total);
      const raw = ((res as unknown as { data?: Record<string, unknown>[] }).data ?? []) as Record<
        string,
        unknown
      >[];
      return {
        projects: raw.map(normalizeProject),
        summary: (res as unknown as { summary?: ProjectsSummary }).summary,
      };
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const projects = result?.projects ?? [];

  // ─── Stats (agregado del backend — sobre TODOS los proyectos, no solo la
  // página actual) ─────────────────────────────────────────────────────────

  const stats = {
    active: result?.summary?.active_projects ?? 0,
    completed: result?.summary?.completed_projects ?? 0,
    onHold: result?.summary?.paused_projects ?? 0,
    delayedMilestones: result?.summary?.overdue_milestones ?? 0,
  };

  // ─── CRUD: Projects ────────────────────────────────────────────────────

  const createProjectMutation = useMutation({
    mutationFn: (payload: ProjectPayload) => projectsService.create(payload),
    meta: { successMessage: 'Proyecto creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<ProjectPayload> }) =>
      projectsService.update(uid, payload),
    meta: { successMessage: 'Proyecto actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (uid: string) => projectsService.remove(uid),
    meta: { successMessage: 'Proyecto eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const createProject = async (payload: ProjectPayload): Promise<boolean> => {
    await createProjectMutation.mutateAsync(payload);
    return true;
  };

  const updateProject = async (uid: string, payload: Partial<ProjectPayload>): Promise<boolean> => {
    await updateProjectMutation.mutateAsync({ uid, payload });
    return true;
  };

  const deleteProject = async (uid: string): Promise<void> => {
    await deleteProjectMutation.mutateAsync(uid);
  };

  // ─── Milestones ────────────────────────────────────────────────────────

  const addMilestoneMutation = useMutation({
    mutationFn: ({ projectUid, payload }: { projectUid: string; payload: MilestonePayload }) =>
      projectsService.addMilestone(projectUid, payload),
    meta: { successMessage: 'Hito agregado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      projectUid,
      milestoneUid,
      payload,
    }: {
      projectUid: string;
      milestoneUid: string;
      payload: Partial<MilestonePayload>;
    }) => projectsService.updateMilestone(projectUid, milestoneUid, payload),
    meta: { successMessage: 'Hito actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ projectUid, milestoneUid }: { projectUid: string; milestoneUid: string }) =>
      projectsService.removeMilestone(projectUid, milestoneUid),
    meta: { successMessage: 'Hito eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const addMilestone = async (projectUid: string, payload: MilestonePayload): Promise<boolean> => {
    await addMilestoneMutation.mutateAsync({ projectUid, payload });
    return true;
  };

  const updateMilestone = async (
    projectUid: string,
    milestoneUid: string,
    payload: Partial<MilestonePayload>
  ): Promise<boolean> => {
    await updateMilestoneMutation.mutateAsync({ projectUid, milestoneUid, payload });
    return true;
  };

  const deleteMilestone = async (projectUid: string, milestoneUid: string): Promise<void> => {
    await deleteMilestoneMutation.mutateAsync({ projectUid, milestoneUid });
  };

  // ─── Resources ─────────────────────────────────────────────────────────

  const addResourceMutation = useMutation({
    mutationFn: ({
      projectUid,
      payload,
    }: {
      projectUid: string;
      payload: ProjectResourcePayload;
    }) => projectsService.addResource(projectUid, payload),
    meta: { successMessage: 'Recurso agregado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const removeResourceMutation = useMutation({
    mutationFn: ({ projectUid, resourceUid }: { projectUid: string; resourceUid: string }) =>
      projectsService.removeResource(projectUid, resourceUid),
    meta: { successMessage: 'Recurso eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list });
    },
  });

  const addResource = async (
    projectUid: string,
    payload: ProjectResourcePayload
  ): Promise<boolean> => {
    await addResourceMutation.mutateAsync({ projectUid, payload });
    return true;
  };

  const removeResource = async (projectUid: string, resourceUid: string): Promise<void> => {
    await removeResourceMutation.mutateAsync({ projectUid, resourceUid });
  };

  return {
    projects,
    isLoading,
    stats,
    createProject,
    updateProject,
    deleteProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addResource,
    removeResource,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.list }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
    /** Search term wired to server-side (backend-supported). */
    search: pagination.search ?? '',
    onChangeSearch: pagination.onChangeSearch,
    status: params?.status ?? 'all',
  };
}
