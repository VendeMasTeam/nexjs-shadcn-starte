// ─────────────────────────────────────────────────────────────────────────────
// Productivity — Domain types (snake_case, backend-aligned)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type ActivityType = 'task' | 'call' | 'meeting' | 'email' | 'note' | 'reminder';
export type InteractionType = 'NOTE' | 'CALL' | 'EMAIL' | 'SYSTEM';
export type ActivitySource = 'agenda' | 'pipeline' | 'project';

// ─── Status configs (UI presentation constants) ────────────────────────────────

export const ACTIVITY_STATUS_CONFIG: Record<
  ActivityStatus,
  { label: string; color: 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }
> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  in_progress: { label: 'En Progreso', color: 'info' },
  completed: { label: 'Completado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'default' },
  overdue: { label: 'Vencido', color: 'error' },
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; color: 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }
> = {
  task: { label: 'Tarea', color: 'info' },
  call: { label: 'Llamada', color: 'success' },
  meeting: { label: 'Reunión', color: 'secondary' },
  email: { label: 'Correo', color: 'default' },
  note: { label: 'Nota', color: 'warning' },
  reminder: { label: 'Recordatorio', color: 'warning' },
};

export const INTERACTION_TYPE_CONFIG: Record<InteractionType, { label: string; icon: string }> = {
  NOTE: { label: 'Nota', icon: 'StickyNote' },
  CALL: { label: 'Llamada', icon: 'PhoneCall' },
  EMAIL: { label: 'Correo', icon: 'Mail' },
  SYSTEM: { label: 'Sistema', icon: 'Activity' },
};

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Activity {
  uid: string;
  contact_uid?: string;
  contact_name?: string;
  type: ActivityType;
  title: string;
  description?: string;
  status: ActivityStatus;
  due_date: string;
  assigned_to_uid?: string;
  assigned_to_name: string;
  // Source provenance
  source?: ActivitySource;
  source_uid?: string;
  source_path?: string;
  source_label?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Interaction {
  uid: string;
  contact_uid: string;
  type: InteractionType;
  content: string;
  author: string;
  created_at: string;
}

export interface Document {
  uid: string;
  contact_uid: string;
  file_name: string;
  url: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// ─── Payload types (for create/update operations) ──────────────────────────────

export interface ActivityPayload {
  type: ActivityType;
  title: string;
  description?: string;
  due_date: string;
  status?: string;
  entity_type?: 'contact' | 'account';
  entity_uid?: string;
  contact_uid?: string; // legacy — maps to entity_type=contact in service
  assigned_to_name?: string;
  source?: ActivitySource;
  source_uid?: string;
  source_path?: string;
  source_label?: string;
}

export interface InteractionPayload {
  type: InteractionType;
  content: string;
}
