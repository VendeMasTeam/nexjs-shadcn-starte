// ─────────────────────────────────────────────────────────────────────────────
// Projects — Domain types (snake_case, backend-aligned)
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'pending'
  | 'planning'
  | 'active'
  | 'in_progress'
  | 'on_hold'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'completed' | 'delayed';
export type ResourceRole = 'consultant' | 'technician' | 'manager' | 'support';

// ─── Status configs (UI presentation constants) ────────────────────────────────

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }
> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  planning: { label: 'Planificación', color: 'secondary' },
  active: { label: 'Activo', color: 'info' },
  in_progress: { label: 'En progreso', color: 'info' },
  on_hold: { label: 'En pausa', color: 'warning' },
  paused: { label: 'Pausado', color: 'warning' },
  completed: { label: 'Completado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' },
};

export const MILESTONE_STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; color: 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'error' }
> = {
  pending: { label: 'Pendiente', color: 'secondary' },
  in_progress: { label: 'En progreso', color: 'info' },
  done: { label: 'Hecho', color: 'info' },
  completed: { label: 'Completado', color: 'success' },
  delayed: { label: 'Vencido', color: 'error' },
};

export const RESOURCE_ROLE_CONFIG: Record<
  ResourceRole,
  {
    label: string;
    color: 'default' | 'secondary' | 'info' | 'warning' | 'success' | 'error' | 'primary';
  }
> = {
  consultant: { label: 'Consultor', color: 'primary' },
  technician: { label: 'Técnico', color: 'info' },
  manager: { label: 'Manager', color: 'secondary' },
  support: { label: 'Soporte', color: 'warning' },
};

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Milestone {
  uid: string;
  name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  status: MilestoneStatus;
  assigned_to_uid: string;
  assigned_to_name?: string;
}

export interface ProjectResource {
  uid: string;
  name: string;
  role: ResourceRole;
  email: string;
  start_date: string;
  end_date?: string;
}

export interface Project {
  uid: string;
  name: string;
  client_uid: string;
  client_name: string;
  opportunity_uid?: string;
  invoice_uid?: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  manager: string;
  description: string;
  milestones: Milestone[];
  resources: ProjectResource[];
  progress: number;
  created_at: string;
  updated_at?: string;
}

// ─── Payload types (for create/update operations) ──────────────────────────────

export interface ProjectPayload {
  name: string;
  client_uid?: string;
  client_name?: string;
  opportunity_uid?: string;
  invoice_uid?: string;
  status?: ProjectStatus;
  start_date: string;
  end_date: string;
  manager?: string;
  description?: string;
}

export interface MilestonePayload {
  name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  status?: MilestoneStatus;
  assigned_to_uid: string;
  assigned_to_name?: string;
}

export interface ProjectResourcePayload {
  name: string;
  role: ResourceRole;
  email: string;
  start_date: string;
  end_date?: string;
}
