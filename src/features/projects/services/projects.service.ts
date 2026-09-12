import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

import type {
  Milestone,
  MilestonePayload,
  Project,
  ProjectPayload,
  ProjectResource,
  ProjectResourcePayload,
} from '../types';

export interface ListProjectsParams extends PaginationParams {
  status?: string;
  invoice_uid?: string;
}

export const projectsService = {
  /** Fetches projects with optional server-side filters */
  list: async (params?: ListProjectsParams): Promise<Project[]> => {
    const res = await axiosInstance.get(endpoints.projects.list, { params });
    return res.data; // full response — callers extract .data for the array
  },

  /** Fetches a single project by UID */
  getById: async (uid: string): Promise<Project | undefined> => {
    try {
      const res = await axiosInstance.get(endpoints.projects.detail(uid));
      return (res.data?.data ?? res.data) as Project;
    } catch {
      return undefined;
    }
  },

  /** Creates a new project */
  create: async (payload: ProjectPayload): Promise<Project> => {
    const res = await axiosInstance.post(endpoints.projects.create, payload);
    return (res.data?.data ?? res.data) as Project;
  },

  /** Updates an existing project */
  update: async (uid: string, payload: Partial<ProjectPayload>): Promise<Project> => {
    const res = await axiosInstance.put(endpoints.projects.update(uid), payload);
    return (res.data?.data ?? res.data) as Project;
  },

  /** Returns the project linked to a given invoice, or null if none */
  getByInvoice: async (invoiceUid: string): Promise<Project | null> => {
    const res = await axiosInstance.get(endpoints.projects.list, {
      params: { invoice_uid: invoiceUid },
    });
    const items: Project[] = res.data?.data ?? [];
    return items[0] ?? null;
  },

  /** Deletes a project */
  remove: async (uid: string): Promise<void> => {
    await axiosInstance.delete(endpoints.projects.delete(uid));
  },

  // ─── Milestones ──────────────────────────────────────────────────────────

  /** Adds a milestone to a project */
  addMilestone: async (projectUid: string, payload: MilestonePayload): Promise<Milestone> => {
    const res = await axiosInstance.post(endpoints.projects.milestones.create(projectUid), payload);
    return (res.data?.data ?? res.data) as Milestone;
  },

  /** Updates a milestone */
  updateMilestone: async (
    projectUid: string,
    milestoneUid: string,
    payload: Partial<MilestonePayload>
  ): Promise<Milestone> => {
    const res = await axiosInstance.put(
      endpoints.projects.milestones.update(projectUid, milestoneUid),
      payload
    );
    return (res.data?.data ?? res.data) as Milestone;
  },

  /** Removes a milestone */
  removeMilestone: async (projectUid: string, milestoneUid: string): Promise<void> => {
    await axiosInstance.delete(endpoints.projects.milestones.delete(projectUid, milestoneUid));
  },

  // ─── Resources ───────────────────────────────────────────────────────────

  /** Assigns a resource to a project */
  addResource: async (
    projectUid: string,
    payload: ProjectResourcePayload
  ): Promise<ProjectResource> => {
    const res = await axiosInstance.post(endpoints.projects.resources.create(projectUid), payload);
    return (res.data?.data ?? res.data) as ProjectResource;
  },

  /** Removes a resource from a project */
  removeResource: async (projectUid: string, resourceUid: string): Promise<void> => {
    await axiosInstance.delete(endpoints.projects.resources.delete(projectUid, resourceUid));
  },

  /** Fetches available resource roles for assignment */
  getResourceRoles: async (): Promise<{ value: string; label: string }[]> => {
    const res = await axiosInstance.get(endpoints.projects.resourceRoles);
    return (res.data?.data ?? []) as Array<{ value: string; label: string }>;
  },
};
