import axiosInstance, { endpoints } from 'src/lib/axios';
import type { Task, TaskPayload } from 'src/features/tasks/types/task.types';

import type { Activity, ActivityPayload, LostReasonInfo, Opportunity } from '../types/sales.types';

export const opportunityService = {
  async getStages() {
    const res = await axiosInstance.get(endpoints.sales.stages);
    return res.data.data;
  },

  async getBoard(params?: { search?: string; origin?: string; product?: string }) {
    const res = await axiosInstance.get(endpoints.sales.board, { params });
    return res.data.data;
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

  async markWon(uid: string, notes?: string): Promise<Opportunity> {
    const res = await axiosInstance.post(endpoints.sales.opportunityWon(uid), { notes });
    return res.data.data;
  },

  async markLost(uid: string, reasons: LostReasonInfo[]): Promise<Opportunity> {
    const res = await axiosInstance.post(endpoints.sales.opportunityLost(uid), {
      lost_reasons: reasons,
    });
    return res.data.data;
  },

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  async getTasks(uid: string): Promise<Task[]> {
    const res = await axiosInstance.get(endpoints.sales.opportunityTasks(uid));
    return res.data.data ?? [];
  },

  async createTask(uid: string, payload: Omit<TaskPayload, 'taskable_type' | 'taskable_uid'>): Promise<Task> {
    const res = await axiosInstance.post(endpoints.sales.opportunityTasks(uid), payload);
    return res.data.data;
  },
};
