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
};

export type TenantInfo = {
  uid: string;
  name: string;
  plan: string;
  logo_url: string | null;
};

export type AuthState = {
  user: UserType;
  tenant: TenantInfo | null;
  loading: boolean;
  permissions: string[];
  modules: Module[];
  features: PlanFeatures;
};

export type AuthContextValue = {
  user: UserType;
  tenant: TenantInfo | null;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  permissions: string[];
  modules: Module[];
  features: PlanFeatures;
  hasPermission: (key: string) => boolean;
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
  features?: PlanFeatures;
};
