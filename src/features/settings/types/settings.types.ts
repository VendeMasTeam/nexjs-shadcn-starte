// ─────────────────────────────────────────────────────────────────────────────
// Settings — Domain types
// ─────────────────────────────────────────────────────────────────────────────

// ── Users ──────────────────────────────────────────────────────────────────
export type UserStatus = 'ACTIVO' | 'INACTIVO';

export interface SettingsUser {
  uid: string;
  name: string;
  email: string;
  role_uid?: string;
  role_name?: string;
  team_uid?: string;
  team_name?: string;
  status: UserStatus;
  is_active?: boolean;
  last_login_at: string;
  created_at: string;
}

// ── Roles & Permissions ────────────────────────────────────────────────────

/** New backend-aligned Permission type (replaces ModulePermission) */
export interface Permission {
  uid: string;
  key: string;
  module: string;
  action: string;
  description: string;
}

/** @deprecated Use Permission instead — backend expects per-permission UIDs */
export type PermissionAction = 'ver' | 'crear' | 'editar' | 'eliminar';

/** @deprecated Use Permission[] + permission_uids instead */
export interface ModulePermission {
  module_uid: string;
  module_name: string;
  actions: PermissionAction[];
}

export interface Role {
  uid: string;
  name: string;
  key: string;
  description: string;
  total_users?: number;
  permission_uids?: string[];
  permission_entries?: { key: string; action: string; description?: string }[];
  is_system: boolean;
  created_at: string;
}

// ── Teams ───────────────────────────────────────────────────────────────────
export interface TeamMember {
  user_uid: string;
  user_name: string;
  role_name: string;
  assigned_clients: number;
}

export interface Team {
  uid: string;
  name: string;
  leader_uid: string;
  leader_name: string;
  members_count: number;
  members: TeamMember[];
  created_at: string;
}

// ── Custom Fields ───────────────────────────────────────────────────────────
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type CustomFieldModule = 'contacts' | 'companies' | 'opportunities' | 'products';

export interface CustomField {
  uid: string;
  key: string;
  name: string;
  label: string; // appended virtual (= name)
  type: CustomFieldType;
  entity_type: string; // PHP class name (App\Models\Contact, etc.)
  module: CustomFieldModule; // appended friendly name
  required: boolean; // appended from options.required
  select_options: string[] | null; // appended for select type
  options?: Record<string, unknown>;
  created_at: string;
}

export interface EntityCustomFieldValue {
  custom_field_uid: string;
  key: string;
  label: string;
  type: CustomFieldType;
  value: unknown;
}

export type CustomFieldCreatePayload = {
  label: string;
  module: CustomFieldModule;
  type: CustomFieldType;
  required?: boolean;
  options?: { values: string[] };
};

export type CustomFieldValuePayload = {
  entity_type: string;
  entity_uid: string;
  custom_field_uid: string;
  value: unknown;
};

// ── Localization ────────────────────────────────────────────────────────────
export interface LocalizationConfig {
  timezone: string;
  currency: string;
  currency_symbol: string;
  date_format: string;
  locale: string;
}
