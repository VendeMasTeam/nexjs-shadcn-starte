import type { Task, TaskPayload } from 'src/features/tasks/types/task.types';
import axiosInstance, { endpoints } from 'src/lib/axios';

import type {
  Activity,
  ActivityPayload,
  LostReasonInfo,
  Opportunity,
  WonInfo,
} from '../types/sales.types';

export const opportunityService = {
  async getStages() {
    const res = await axiosInstance.get(endpoints.sales.stages);
    return res.data.data;
  },

  async getBoard(params?: {
    search?: string;
    origin?: string;
    product?: string;
    closed_days?: number;
    include_closed?: boolean;
  }) {
    const res = await axiosInstance.get(endpoints.sales.board, { params });
    return res.data.data;
  },

  // Reordenar oportunidades DENTRO de la misma etapa (drag and drop en el kanban)
  async reorderBoard(stageUid: string, orderedOpportunityUids: string[]): Promise<void> {
    await axiosInstance.post(endpoints.sales.boardReorder, {
      stage_uid: stageUid,
      ordered_opportunity_uids: orderedOpportunityUids,
    });
  },

  // Historial paginado — no reconstruir esto a partir del board
  async getHistory(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    stage_uid?: string;
    owner_user_uid?: string;
    origin?: string;
    status?: 'active' | 'open' | 'closed' | 'won' | 'lost';
    created_from?: string;
    created_to?: string;
    closed_from?: string;
    closed_to?: string;
  }): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.sales.history, { params });
    return res.data;
  },

  async getList(): Promise<Opportunity[]> {
    const res = await axiosInstance.get(endpoints.sales.opportunities);
    return res.data.data;
  },

  async getOne(uid: string): Promise<Opportunity> {
    const res = await axiosInstance.get(endpoints.sales.opportunity(uid));
    return res.data.data;
  },

  async create(data: Partial<Opportunity>): Promise<Opportunity> {
    const res = await axiosInstance.post(endpoints.sales.opportunities, data);
    return res.data.data;
  },

  async update(uid: string, data: Partial<Opportunity>): Promise<Opportunity> {
    const res = await axiosInstance.put(endpoints.sales.opportunity(uid), data);
    return res.data.data;
  },

  async delete(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.sales.opportunity(uid));
  },

  // ─── Activities ──────────────────────────────────────────────────────────────

  async getActivities(uid: string): Promise<Activity[]> {
    const res = await axiosInstance.get(endpoints.sales.opportunityActivities(uid));
    return res.data.data;
  },

  async createActivity(uid: string, payload: ActivityPayload): Promise<Activity> {
    const res = await axiosInstance.post(endpoints.sales.opportunityActivities(uid), payload);
    return res.data.data;
  },

  async updateActivity(
    uid: string,
    activityUid: string,
    payload: Partial<ActivityPayload>
  ): Promise<Activity> {
    const res = await axiosInstance.put(
      endpoints.sales.opportunityActivity(uid, activityUid),
      payload
    );
    return res.data.data;
  },

  async deleteActivity(uid: string, activityUid: string): Promise<void> {
    await axiosInstance.delete(endpoints.sales.opportunityActivity(uid, activityUid));
  },

  // ─── Won / Lost ──────────────────────────────────────────────────────────────

  async markWon(uid: string, info?: WonInfo): Promise<Opportunity> {
    const res = await axiosInstance.post(endpoints.sales.opportunityWon(uid), {
      comment: info?.comment,
      ...(info?.competitor
        ? { competitor: info.competitor }
        : info?.competitor_uid
          ? { competitor_uid: info.competitor_uid }
          : {}),
    });
    return res.data.data.opportunity;
  },

  async markLost(uid: string, reasons: LostReasonInfo[]): Promise<Opportunity> {
    const res = await axiosInstance.post(endpoints.sales.opportunityLost(uid), {
      lost_reasons: reasons.map(({ reason_type, competitor_uid, competitor, detail }) => ({
        reason_type,
        detail,
        ...(competitor ? { competitor } : competitor_uid ? { competitor_uid } : {}),
      })),
    });
    return res.data.data.opportunity;
  },

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  async getTasks(uid: string): Promise<Task[]> {
    const res = await axiosInstance.get(endpoints.sales.opportunityTasks(uid));
    return res.data.data ?? [];
  },

  async createTask(
    uid: string,
    payload: Omit<TaskPayload, 'taskable_type' | 'taskable_uid'>
  ): Promise<Task> {
    const res = await axiosInstance.post(endpoints.sales.opportunityTasks(uid), payload);
    return res.data.data;
  },
};
