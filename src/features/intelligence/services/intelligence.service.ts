import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

import type { Battlecard, Competitor, LostReason } from '../types';

export interface CreateCompetitorPayload {
  name: string;
  website?: string;
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const intelligenceService = {
  // ── Battlecards ──────────────────────────────────────────────────────────

  battlecards: {
    getAll: async (params?: PaginationParams & { search?: string }): Promise<Battlecard[]> => {
      const res = await axiosInstance.get(endpoints.intelligence.battlecards.list, { params });
      return res.data; // full response — callers extract .data for the array
    },

    getById: async (uid: string): Promise<Battlecard | undefined> => {
      const res = await axiosInstance.get(endpoints.intelligence.battlecards.detail(uid));
      return (res.data?.data ?? res.data) as Battlecard;
    },

    create: async (
      payload: Omit<
        Battlecard,
        | 'uid'
        | 'win_rate'
        | 'deals_tracked'
        | 'deals_won'
        | 'created_at'
        | 'updated_at'
        | 'deals_value'
      >
    ): Promise<Battlecard> => {
      const res = await axiosInstance.post(endpoints.intelligence.battlecards.create, payload);
      return (res.data?.data ?? res.data) as Battlecard;
    },

    update: async (
      uid: string,
      payload: Partial<
        Omit<
          Battlecard,
          'uid' | 'win_rate' | 'deals_tracked' | 'deals_won' | 'created_at' | 'updated_at'
        >
      >
    ): Promise<Battlecard> => {
      const res = await axiosInstance.put(endpoints.intelligence.battlecards.update(uid), payload);
      return (res.data?.data ?? res.data) as Battlecard;
    },

    delete: async (uid: string): Promise<void> => {
      await axiosInstance.delete(endpoints.intelligence.battlecards.delete(uid));
    },
  },

  // ── Lost Reasons ─────────────────────────────────────────────────────────

  lostReasons: {
    getAll: async (
      params?: PaginationParams & { reason_type?: string; competitor_uid?: string; search?: string }
    ): Promise<LostReason[]> => {
      const res = await axiosInstance.get(endpoints.intelligence.lostReasons.list, { params });
      return res.data; // full response — callers extract .data for the array
    },

    create: async (payload: Omit<LostReason, 'uid'>): Promise<LostReason> => {
      const res = await axiosInstance.post(endpoints.intelligence.lostReasons.create, payload);
      return (res.data?.data ?? res.data) as LostReason;
    },

    update: async (uid: string, payload: Partial<Omit<LostReason, 'uid'>>): Promise<LostReason> => {
      const res = await axiosInstance.put(endpoints.intelligence.lostReasons.update(uid), payload);
      return (res.data?.data ?? res.data) as LostReason;
    },

    delete: async (uid: string): Promise<void> => {
      await axiosInstance.delete(endpoints.intelligence.lostReasons.delete(uid));
    },
  },

  // ── Lost Reasons Report ───────────────────────────────────────────────────

  async getLostReasonsReport(): Promise<Record<string, unknown>> {
    const res = await axiosInstance.get(endpoints.intelligence.lostReasonsReport);
    return res.data?.data ?? res.data;
  },

  // ── Competitors ──────────────────────────────────────────────────────────

  competitors: {
    getAll: async (params?: PaginationParams): Promise<Competitor[]> => {
      const res = await axiosInstance.get(endpoints.intelligence.competitors.list, { params });
      return res.data; // full response — callers extract .data for the array
    },
    create: async (data: CreateCompetitorPayload): Promise<Competitor> => {
      const res = await axiosInstance.post(endpoints.intelligence.competitors.store, data);
      return res.data?.data ?? res.data;
    },
    update: async (uid: string, data: Partial<CreateCompetitorPayload>): Promise<Competitor> => {
      const res = await axiosInstance.put(endpoints.intelligence.competitors.update(uid), data);
      return res.data?.data ?? res.data;
    },
    delete: async (uid: string): Promise<void> => {
      await axiosInstance.delete(endpoints.intelligence.competitors.delete(uid));
    },
  },
};
