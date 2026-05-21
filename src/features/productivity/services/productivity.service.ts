import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

import type {
  Activity,
  ActivityPayload,
  ActivityStatus,
  Document,
  Interaction,
  InteractionPayload,
} from '../types/productivity.types';

export interface ActivityUpdatePayload {
  title?: string;
  description?: string;
  type?: Activity['type'];
  status?: Activity['status'];
  due_date?: string;
  assigned_to_name?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export const productivityService = {
  // ─── Activities ─────────────────────────────────────────────────────────

  listActivities: async (
    contactUid?: string,
    params?: PaginationParams,
    entityType?: 'contact' | 'account'
  ): Promise<Activity[]> => {
    const url = endpoints.productivity.activities.list;
    const entityParams =
      contactUid && entityType
        ? { entity_type: entityType, entity_uid: contactUid }
        : contactUid
          ? { entity_type: 'contact', entity_uid: contactUid }
          : {};
    const res = await axiosInstance.get(url, {
      params: { ...entityParams, ...params },
    });
    return res.data; // full response — callers extract .data for the array
  },

  getActivity: async (uid: string): Promise<Activity> => {
    const res = await axiosInstance.get(endpoints.productivity.activities.detail(uid));
    return (res.data?.data ?? res.data) as Activity;
  },

  createActivity: async (payload: ActivityPayload): Promise<Activity> => {
    const body: Record<string, unknown> = {
      type: payload.type,
      title: payload.title,
      description: payload.description,
      scheduled_at: payload.due_date,
      status: payload.status ?? 'pending',
      ...(payload.entity_type && payload.entity_uid
        ? { entity_type: payload.entity_type, entity_uid: payload.entity_uid }
        : payload.contact_uid
          ? { entity_type: 'contact', entity_uid: payload.contact_uid }
          : {}),
    };
    const res = await axiosInstance.post(endpoints.productivity.activities.create, body);
    return (res.data?.data ?? res.data) as Activity;
  },

  updateActivity: async (uid: string, payload: ActivityUpdatePayload): Promise<Activity> => {
    const body: Record<string, unknown> = { ...payload };
    if (payload.due_date) {
      body.scheduled_at = payload.due_date;
      delete body.due_date;
    }
    const res = await axiosInstance.put(endpoints.productivity.activities.update(uid), body);
    return (res.data?.data ?? res.data) as Activity;
  },

  deleteActivity: async (uid: string): Promise<void> => {
    await axiosInstance.delete(endpoints.productivity.activities.delete(uid));
  },

  updateActivityStatus: async (uid: string, status: ActivityStatus): Promise<Activity> => {
    const res = await axiosInstance.put(endpoints.productivity.activities.update(uid), {
      status,
    });
    return (res.data?.data ?? res.data) as Activity;
  },

  listActivitiesByRange: async (start: string, end: string): Promise<Activity[]> => {
    const res = await axiosInstance.get(endpoints.productivity.activities.range, {
      params: { start, end },
    });
    return (res.data?.data ?? res.data ?? []) as Activity[];
  },

  // ─── Interactions ──────────────────────────────────────────────────────

  listInteractions: async (
    contactUid: string,
    params?: PaginationParams
  ): Promise<Interaction[]> => {
    const res = await axiosInstance.get(endpoints.productivity.interactions.list(contactUid), {
      params,
    });
    return res.data; // full response — callers extract .data for the array
  },

  getTimeline: async (): Promise<Interaction[]> => {
    const res = await axiosInstance.get(endpoints.productivity.interactions.timeline);
    return (res.data?.data ?? res.data ?? []) as Interaction[];
  },

  createInteraction: async (
    contactUid: string,
    payload: InteractionPayload
  ): Promise<Interaction> => {
    const res = await axiosInstance.post(
      endpoints.productivity.interactions.list(contactUid),
      payload
    );
    return (res.data?.data ?? res.data) as Interaction;
  },

  createNote: async (
    payload: InteractionPayload & { contact_uid?: string }
  ): Promise<Interaction> => {
    const res = await axiosInstance.post(endpoints.productivity.interactions.notes, payload);
    return (res.data?.data ?? res.data) as Interaction;
  },

  createCall: async (
    payload: InteractionPayload & { contact_uid?: string }
  ): Promise<Interaction> => {
    const res = await axiosInstance.post(endpoints.productivity.interactions.calls, payload);
    return (res.data?.data ?? res.data) as Interaction;
  },

  createEmail: async (
    payload: InteractionPayload & { contact_uid?: string }
  ): Promise<Interaction> => {
    const res = await axiosInstance.post(endpoints.productivity.interactions.emails, payload);
    return (res.data?.data ?? res.data) as Interaction;
  },

  // ─── Documents / Vault ─────────────────────────────────────────────────

  listDocuments: async (entityType: string, entityUid: string): Promise<Document[]> => {
    const res = await axiosInstance.get(
      endpoints.productivity.documents.list(entityType, entityUid)
    );
    return (res.data?.data ?? res.data ?? []) as Document[];
  },

  uploadDocument: async (entityType: string, entityUid: string, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_uid', entityUid);

    const res = await axiosInstance.post(endpoints.productivity.documents.upload, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res.data?.data ?? res.data) as Document;
  },

  deleteDocument: async (entityType: string, entityUid: string, docUid: string): Promise<void> => {
    await axiosInstance.delete(endpoints.productivity.documents.delete(docUid));
  },
};
