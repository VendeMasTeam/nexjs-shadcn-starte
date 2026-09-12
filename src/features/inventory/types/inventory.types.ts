export interface InventoryCategory {
  uid: string;
  name: string;
  description: string | null;
}

export interface WarehouseItemSummary {
  sku_count: number;
  total_physical: number;
  total_reserved: number;
  total_available: number;
  total_value: number;
}

export interface Warehouse {
  uid: string;
  name: string;
  code: string;
  location: string | null;
  is_active: boolean;
  summary: WarehouseItemSummary;
}

export interface MovementsSummary {
  total: number;
  entries: number;
  transfers: number;
  adjustments: number;
}

export interface WarehouseStockEntry {
  uid: string;
  product_uid: string;
  warehouse_uid: string;
  physical_stock: number;
  reserved_stock: number;
  available_stock: number;
  stock_state: 'out' | 'low' | 'normal';
  stock_indicator: 'red' | 'yellow' | 'green';
  warehouse: Pick<Warehouse, 'uid' | 'name' | 'code'>;
}

export interface InventoryMasterItem {
  uid: string;
  sku: string;
  name: string;
  description: string | null;
  category_uid: string | null;
  category_name: string | null;
  reorder_point: number;
  is_active: boolean;
  unit_cost: number | null;
  sale_price: number | null;
  discount_percent: number | null;
  stock_physical_total: number;
  stock_reserved_total: number;
  stock_available_total: number;
  stock_state: 'out' | 'low' | 'normal';
  stock_indicator: 'red' | 'yellow' | 'green';
  stocks: WarehouseStockEntry[];
}

export interface WarehouseListSummary {
  total_warehouses: number;
  active_warehouses: number;
  stock_physical_total: number;
  stock_available_total: number;
  stock_value_total: number;
}

export interface InventoryMasterSummary {
  products: number;
  active_products: number;
  out_of_stock_count: number;
  total_physical_stock: number;
  total_reserved_stock: number;
  total_available_stock: number;
}

export interface InventoryMasterResponse {
  filters: {
    category_uid: string | null;
    warehouse_uid: string | null;
    stock_state: string | null;
  };
  data: InventoryMasterItem[];
  summary: InventoryMasterSummary;
}

export type MovementType =
  | 'transfer'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'set_balance'
  | 'reservation'
  | 'reservation_release'
  | 'reservation_consume';

export interface InventoryMovement {
  uid: string;
  type: MovementType;
  quantity: number;
  comment: string | null;
  reference_type: string | null;
  reference_uid: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  product: { uid: string; name: string; sku: string } | null;
  from_warehouse: Pick<Warehouse, 'uid' | 'name'> | null;
  to_warehouse: Pick<Warehouse, 'uid' | 'name'> | null;
  performed_by: { uid: string; name: string } | null;
}

export interface AdjustStockPayload {
  product_uid: string;
  warehouse_uid: string;
  operation: 'in' | 'out' | 'set';
  quantity: number;
  comment?: string;
}

export interface TransferStockPayload {
  product_uid: string;
  from_warehouse_uid: string;
  to_warehouse_uid: string;
  quantity: number;
  comment?: string;
}

export interface CreateProductPayload {
  category_uid?: string;
  sku: string;
  name: string;
  description?: string;
  reorder_point?: number;
  is_active?: boolean;
  unit_cost?: number;
  sale_price?: number;
  discount_percent?: number;
  warehouse_stocks?: { warehouse_uid: string; quantity: number }[];
}

export interface CreateWarehousePayload {
  name: string;
  code: string;
  location?: string;
  is_active?: boolean;
}
