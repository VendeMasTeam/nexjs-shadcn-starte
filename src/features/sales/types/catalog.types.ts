export interface CatalogProduct {
  uid: string;
  name: string;
  sku: string;
  type: 'product' | 'service';
  description: string | null;
  status: 'active' | 'inactive';
  default_price: number | null;
  default_discount_percent: number | null;
  inventory_product_uid: string | null;
  inventory_product: {
    uid: string;
    sku: string;
    name: string;
    unit_cost: number | null;
    sale_price: number | null;
    discount_percent: number | null;
    stock_available_total: number;
  } | null;
  custom_fields?: {
    custom_field_uid: string;
    key: string;
    label: string;
    type: string;
    value: unknown;
  }[];
  created_at: string;
  updated_at: string;
}

export interface CreateCatalogProductPayload {
  name: string;
  sku: string;
  type: 'product' | 'service';
  description?: string;
  status?: 'active' | 'inactive';
  default_price?: number;
  default_discount_percent?: number;
  inventory_product_uid?: string;
}
