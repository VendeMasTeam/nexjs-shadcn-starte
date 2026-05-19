// ─── Entity Types (snake_case — must match Laravel backend JSON keys) ─────────

export interface Opportunity {
  uid: string;
  title: string;
  email?: string;
  amount: number;
  currency?: string;
  expected_close_date: string;
  stage_uid: string;
  stage_name: string;
  description?: string;
  won_at?: string;
  lost_at?: string;
  opportunityable_type: string;
  opportunityable_uid: string;
  owner_user_uid: string;
  created_at: string;
  updated_at: string;
  /** Populated by GET /opportunities/{uid} detail endpoint */
  lost_reasons?: LostReasonInfo[];
}

export interface PipelineStage {
  uid: string;
  key: string;
  name: string;
  position: number;
  probability_percent: number;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  color?: string; // frontend-assigned, not from backend
}

export interface Quotation {
  uid: string;
  quote_number: string;
  title: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled' | 'invoiced';
  currency: string;
  exchange_rate?: number;
  local_currency?: string;
  valid_until?: string;
  subtotal: number;
  discount_total: number;
  total: number;
  reserved_items_count?: number;
  reservation_indicator?: string;
  owner_user_uid: string;
  created_by_user_uid: string;
  price_book_uid?: string;
  notes?: string;
  items: QuotationItem[];
  quoteable_type?: string | null;
  quoteable_uid?: string | null;
  entity_type?: string;
  entity_uid?: string;
  client_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  uid: string;
  description: string;
  sku?: string;
  quantity: number;
  list_unit_price: number;
  discount_percent: number;
  net_unit_price: number;
  unit_cost?: number;
  margin_percent?: number;
  line_total: number;
  discount_total: number;
  product_uid?: string;
  warehouse_uid?: string;
}

export interface Invoice {
  uid: string;
  invoice_number: string;
  quotation_uid: string;
  issued_at: string;
  due_date: string;
  status: 'draft' | 'issued' | 'partial' | 'paid' | 'overdue';
  total: number;
  paid_total: number;
  outstanding_total: number;
  subtotal: number;
  discount_total: number;
  currency: string;
  quote_currency?: string;
  exchange_rate?: number;
  meta?: Record<string, unknown>;
  invoiceable_type: string;
  invoiceable_uid: string;
  entity_type?: string;
  entity_label?: string;
  entity_uid?: string;
  client_name?: string;
  client_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  uid: string;
  amount: number;
  method: string;
  payment_date: string;
  external_reference?: string;
  invoice_uid: string;
  meta?: Record<string, unknown>;
}

// ─── Standalone Types (used by separate endpoints — not embedded in Opportunity) ─

export type ActivityType = 'llamada' | 'email' | 'reunion' | 'demo' | 'seguimiento' | 'nota';
export type ActivityStatus = 'pendiente' | 'completada' | 'cancelada';

/** Raw response from GET /opportunities/{uid}/activities (backend Activity model) */
export interface Activity {
  uid: string;
  type: string;
  title?: string;
  description?: string;
  scheduled_at: string;
  completed_at?: string;
  status?: string;
  priority?: string;
  owner_user_uid?: string;
  owner_user_name?: string;
  assigned_to_name?: string;
  activityable_uid?: string;
}

/** Maps backend English type → frontend Spanish ActivityType */
export function normalizeActivityType(type: string): ActivityType {
  const map: Record<string, ActivityType> = {
    note: 'nota',
    call: 'llamada',
    meeting: 'reunion',
    email: 'email',
    reminder: 'seguimiento',
    task: 'seguimiento',
  };
  return map[type] ?? (type as ActivityType);
}

export interface ActivityPayload {
  type: ActivityType;
  content: string;
  date: string;
}

export interface Note {
  uid: string;
  content: string;
  author: string;
  created_at: string;
}

export type LostReasonCategory = string;

export interface LostReasonInfo {
  category: string;
  competitor_uid?: string;
  competitor_name?: string;
  detail: string;
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export interface FinanceDashboardStats {
  monthly_sales: number;
  monthly_sales_growth_percent: number;
  pending_invoices_count: number;
  pending_invoices_amount: number;
  overdue_portfolio: number;
  overdue_clients_count: number;
  average_margin_percent: number;
  margin_target_percent: number;
}

export interface FinanceDashboardInvoice {
  uid: string;
  invoice_number: string;
  client_name: string;
  issued_at: string;
  amount: number;
  status: 'issued' | 'partial' | 'paid' | 'overdue' | 'draft';
}

export interface FinanceDashboard {
  stats: FinanceDashboardStats;
  weekly_sales: number[];
  recent_invoices: FinanceDashboardInvoice[];
}

// ─── Currency Rates ───────────────────────────────────────────────────────────

export interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  last_update: string;
  status: 'active' | 'outdated';
}

// ─── Credit Rules ─────────────────────────────────────────────────────────────

export interface CreditRuleSettings {
  max_days: number;
  max_amount: number;
  auto_block: boolean;
}

export interface CreditException {
  uid: string;
  client_name: string;
  client_identifier: string;
  credit_limit: number;
  max_days: number;
  is_active: boolean;
}

// ─── Status Labels: English codes (from backend) → Spanish UI labels ──────────

export const STATUS_LABELS: Record<string, string> = {
  // Quotation statuses
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  // Invoice statuses
  issued: 'Emitida',
  partial: 'Parcial',
  paid: 'Pagada',
  overdue: 'Vencida',
  // Quotation extra
  invoiced: 'Facturada',
};
