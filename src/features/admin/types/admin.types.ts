export type EstadoTenant = 'ACTIVO' | 'TRIAL' | 'VENCIDO' | 'SUSPENDIDO' | 'INACTIVO' | 'ARCHIVADO';
export type EstadoFactura = 'PAGADA' | 'PENDIENTE' | 'VENCIDA' | 'CANCELADA';
export type TierPlan = 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type SoportePlan = 'EMAIL' | 'EMAIL_CHAT' | 'DEDICADO';

export interface Tenant {
  uid: string;
  nombre: string;
  dominio: string;
  pais: string;
  email_contacto: string;
  plan_uid: string;
  plan_nombre: string;
  mrr: number;
  estado: EstadoTenant;
  total_usuarios: number;
  limite_usuarios: number;
  almacenamiento_usado_gb: number;
  limite_almacenamiento_gb: number;
  api_calls_mes: number;
  limite_api_calls: number;
  created_at: string;
  last_access_at: string;
  expires_at?: string | null;
}

export interface TenantUser {
  uid: string;
  name: string;
  email: string;
  rol: string;
  ultimo_acceso: string;
  estado: 'Activo' | 'Inactivo';
}

export interface TenantFacturaItem {
  periodo: string;
  total: number;
  status: EstadoFactura;
  due_at: string;
}

export interface TenantActividadItem {
  timestamp: string;
  message: string;
}

export interface FeaturesPlan {
  storage_gb: number | null;
  api_calls_month: number | null;
  modules: string[];
  support_type: SoportePlan;
  sla_uptime: number | null;
  custom_domain: boolean;
  sso: boolean;
  advanced_reports: boolean;
}

export interface PlanSaaS {
  uid: string;
  name: string;
  tier: TierPlan;
  price: number;
  billing_interval: 'MENSUAL' | 'ANUAL';
  status: 'ACTIVO' | 'INACTIVO' | 'LEGADO';
  max_users: number | null;
  features: FeaturesPlan;
  total_tenants: number;
  created_at: string;
}

export interface Factura {
  uid: string;
  tenant_uid: string;
  tenant_nombre: string;
  periodo: string;
  plan_nombre: string;
  subtotal: number;
  tax: number;
  total: number;
  status: EstadoFactura;
  issued_at: string;
  due_at: string;
}

export interface LogEntry {
  uid: string;
  tenant_uid: string;
  tenant_nombre: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  timestamp: string;
  errors_last_24h?: number;
  severity?: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO';
}

export interface Alerta {
  uid: string;
  nombre: string;
  metric: 'errores' | 'warnings' | 'latencia' | 'uptime';
  operator: '>' | '<' | '>=' | '<=';
  value: number;
  period: '1h' | '6h' | '24h' | '7d';
  canales: ('EMAIL' | 'SLACK' | 'PUSH')[];
  estado: 'ACTIVO' | 'INACTIVO';
  last_triggered_at: string | null;
}

export interface TelemetryStats {
  uptime_global_percent: number;
  latencia_p95_ms: number | null;
  errores_24h: number;
  warnings_24h: number;
  tenants_with_errors: number;
  active_alerts: number;
}

export interface MrrHistoryPoint {
  mes: string;
  valor: number;
}

export interface DashboardData {
  mrr_total: number;
  mrr_growth_percent: number;
  mrr_history: MrrHistoryPoint[];
  tenants_activos: number;
  tenants_trial: number;
  facturas_vencidas: number;
  errores_criticos_24h: number;
  tenants_en_riesgo: Tenant[];
  tenants_recientes: Tenant[];
}

export interface BillingSummary {
  cobrado_este_mes: number;
  pendiente_cobro: number;
  facturas_vencidas: number;
  total_facturas: number;
  pagadas: number;
  pendientes: number;
  vencidas: number;
}

export interface TenantErrorByTenant {
  tenant_uid: string;
  tenant_nombre: string;
  errors_24h: number;
  tipo_mas_frecuente: string;
  ultimo_error_at: string;
  severity: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO';
  estado: string;
}

// --- Platform Users & Roles ---

export interface PlatformPermission {
  uid: string;
  key: string;
  module: string;
  action: string;
  description: string;
}

export type PlatformUserStatus = 'ACTIVO' | 'INACTIVO';

export interface PlatformAdminRole {
  uid: string;
  name: string;
  key: string;
  description?: string;
  is_system: boolean;
  permissions?: PlatformPermission[];
}

export interface PlatformUser {
  uid: string;
  name: string;
  email: string;
  is_platform_admin: boolean;
  avatar_url: string | null;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  is_active: boolean;
  status: PlatformUserStatus;
  admin_roles: PlatformAdminRole[];
}

export interface PlatformRole {
  uid: string;
  name: string;
  key: string;
  description: string;
  is_system: boolean;
  total_users: number;
  permissions?: PlatformPermission[];
  created_at: string;
  updated_at?: string;
}

export type PlatformUserPayload = {
  name: string;
  email: string;
  password?: string;
  admin_role_uids?: string[];
};

export type PlatformRolePayload = {
  name: string;
  key: string;
  description?: string;
  permission_uids?: string[];
};

// --- Payload types ---

export type PlanPayload = Omit<PlanSaaS, 'uid' | 'created_at' | 'total_tenants'>;
export type AlertaPayload = Omit<Alerta, 'uid'>;
export type CreateTenantUserPayload = { name: string; email: string; role: string };

// --- Billing filters ---

export interface BillingFilters {
  tenant_uid?: string;
  search?: string;
  plan_uid?: string;
  plan_nombre?: string;
  estado?: EstadoFactura;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export type BillingExportFilters = Omit<BillingFilters, 'page' | 'per_page'> & {
  format?: 'json' | 'csv';
};
