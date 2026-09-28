export type PlanFeatures = {
  inventory: boolean;
  reports: boolean;
  multicurrency: boolean;
  custom_fields: boolean;
  [key: string]: boolean;
};

export type UserType = {
  uid: string;
  name: string;
  email: string;
  role?: string;
  tenant_uid?: string;
  tenant_plan?: string;
  two_factor_enabled?: boolean;
  locked_until?: string | null;
  permissions: string[];
} | null;

export type AuthUser = UserType;

export type ModuleItem = {
  key: string;
  enabled: boolean;
};

export type Module = {
  key: string;
  label: string;
  enabled: boolean;
  permissions: string[];
  items?: ModuleItem[];
  /**
   * Módulos RBAC reales que cubre esta área del plan (ej: "sales" cubre
   * ["opportunities","quotations","products","finance","price-books"]).
   * `modules[].key` es un nombre de producto/plan; `permission.module` es el
   * nombre RBAC real — no coinciden 1:1, por eso backend manda este mapeo
   * explícito. Ver role-drawer.tsx: filtra por permission_modules.includes(...),
   * NO reconstruyendo "${module.key}.${accion}" contra permission.key.
   */
  permission_modules: string[];
};

export type TenantInfo = {
  uid: string;
  name: string;
  plan: string;
  logo_url: string | null;
};

// ─── Support mode (impersonation de plataforma) ──────────────────────────────

export type SupportMode = {
  active: boolean;
  tenant_uid?: string;
  tenant_name?: string;
  mode?: string;
  readonly?: boolean;
  expires_at?: string | null;
};

export const SUPPORT_MODE_INACTIVE: SupportMode = { active: false };

export type AuthState = {
  user: UserType;
  tenant: TenantInfo | null;
  loading: boolean;
  // Permisos de TENANT (permissions.effective en /auth/init) — módulos del tenant.
  permissions: string[];
  // Permisos de PLATAFORMA/superadmin/soporte (admin_permissions en /auth/init).
  // Nunca se mezcla con `permissions` — son dos dominios de autorización distintos.
  adminPermissions: string[];
  modules: Module[];
  features: PlanFeatures;
  supportMode: SupportMode;
};

export type AuthContextValue = {
  user: UserType;
  tenant: TenantInfo | null;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  permissions: string[];
  adminPermissions: string[];
  modules: Module[];
  features: PlanFeatures;
  supportMode: SupportMode;
  /** Chequea permisos de TENANT (permissions.effective) */
  hasPermission: (key: string) => boolean;
  /** Chequea permisos de PLATAFORMA (admin_permissions) — botones de admin/superadmin/soporte */
  hasAdminPermission: (key: string) => boolean;
  hasFeature: (key: string) => boolean;
  checkUserSession: () => Promise<{ permissions: string[]; modules: Module[]; role?: string }>;
};

// ─── Auth/Init response (POST /auth/init — PlatformInitService::init()) ──────

/** Shape of `permissions` in the POST /auth/init response */
export type InitPermissions = {
  effective: string[];
};

/** Full payload shape returned by POST /auth/init */
export type InitPayload = {
  user: NonNullable<UserType> & { uid: string }; // user is guaranteed present on success
  tenant?: TenantInfo;
  modules: Module[];
  localization?: {
    currency?: string;
    locale?: string;
    timezone?: string;
    [key: string]: unknown;
  };
  permissions: InitPermissions;
  // Permisos de plataforma/superadmin/soporte — siempre presente, vacío para usuarios de tenant
  admin_permissions?: string[];
  features?: PlanFeatures;
  support_mode?: SupportMode;
};
