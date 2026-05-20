import type {
  CreateProductPayload,
  InventoryMasterItem,
  InventoryMasterResponse,
} from 'src/features/inventory/types/inventory.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

export const inventoryProductService = {
  async master(
    params?: PaginationParams & {
      category_uid?: string;
      warehouse_uid?: string;
      stock_state?: 'normal' | 'low' | 'out';
      search?: string;
      is_active?: boolean;
    }
  ): Promise<InventoryMasterResponse> {
    const res = await axiosInstance.get(endpoints.inventory.master, { params });
    return res.data; // full response includes { data, summary, meta }
  },

  async list(): Promise<InventoryMasterItem[]> {
    const res = await axiosInstance.get(endpoints.inventory.products);
    return res.data.data;
  },

  async create(payload: CreateProductPayload): Promise<InventoryMasterItem> {
    const res = await axiosInstance.post(endpoints.inventory.products, payload);
    return res.data.data;
  },

  async update(uid: string, payload: Partial<CreateProductPayload>): Promise<InventoryMasterItem> {
    const res = await axiosInstance.put(endpoints.inventory.product(uid), payload);
    return res.data.data;
  },

  async remove(uid: string): Promise<void> {
    await axiosInstance.delete(endpoints.inventory.product(uid));
  },
};
