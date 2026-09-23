// ─── Report Data Shapes ────────────────────────────────────────────────────────

export interface ReportKpis {
  [key: string]: string | number;
}

export interface ReportChartData {
  series: number[] | { name: string; data: number[] }[];
  labels?: string[];
  categories?: string[];
}

export interface ReportTableRow {
  [key: string]: unknown;
}

export interface SalesReport {
  kpis: ReportKpis;
  chart_data: ReportChartData;
  table_data: ReportTableRow[];
}

export interface InventoryReport {
  kpis: ReportKpis;
  chart_data: ReportChartData;
  table_data: ReportTableRow[];
  most_critical?: {
    sku: string;
    name: string;
    available: number;
    min_stock: number;
  } | null;
}

// ─── Filter Types ──────────────────────────────────────────────────────────────

export interface ReportFilterParams {
  period: string;
  warehouse?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  /** TODO(backend-pendiente): Backend ReportService no soporta `search`.
   *  Cuando se agregue, este campo se enviará al endpoint y el filtrado
   *  será server-side. Mientras tanto, el search bar existe en la UI
   *  pero no produce filtrado efectivo. */
  search?: string;
}

// ─── Tab Identifiers ───────────────────────────────────────────────────────────

export type SalesReportTab = 'status' | 'products' | 'distributors' | 'vs';

export type InventoryReportTab = 'warehouse' | 'risk' | 'movements' | 'category' | 'b2b';
