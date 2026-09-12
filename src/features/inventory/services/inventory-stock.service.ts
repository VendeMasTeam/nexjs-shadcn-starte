import type {
  AdjustStockPayload,
  InventoryCategory,
  MovementsSummary,
  TransferStockPayload,
} from 'src/features/inventory/types/inventory.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { type PaginationParams } from 'src/shared/lib/pagination';

export const inventoryStockService = {
  async movements(
    params?: {
      product_uid?: string;
      warehouse_uid?: string;
      type?: string;
      search?: string;
    } & PaginationParams
  ): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.inventory.movements, { params });
    return res.data;
  },

  async adjust(payload: AdjustStockPayload): Promise<void> {
    await axiosInstance.post(endpoints.inventory.adjust, payload);
  },

  // Para múltiples productos en una sola operación (ej: registrar entrada de mercancía).
  // No usar en loop con adjust() singular — un solo request para todos los items.
  async adjustBulk(payload: {
    warehouse_uid: string;
    comment?: string;
    items: { product_uid: string; quantity: number }[];
  }): Promise<void> {
    await axiosInstance.post(endpoints.inventory.adjustBulk, payload);
  },

  async transfer(payload: TransferStockPayload): Promise<void> {
    await axiosInstance.post(endpoints.inventory.transfer, payload);
  },

  async categories(params?: {
    search?: string;
    per_page?: number;
    page?: number;
  }): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.inventory.categories, { params });
    return res.data;
  },

  async createCategory(payload: {
    name: string;
    description?: string;
  }): Promise<InventoryCategory> {
    const res = await axiosInstance.post(endpoints.inventory.categories, payload);
    return res.data.data;
  },

  async updateCategory(
    uid: string,
    payload: { name?: string; description?: string }
  ): Promise<InventoryCategory> {
    const res = await axiosInstance.put(`${endpoints.inventory.categories}/${uid}`, payload);
    return res.data.data;
  },

  async deleteCategory(uid: string): Promise<void> {
    await axiosInstance.delete(`${endpoints.inventory.categories}/${uid}`);
  },

  async movementsSummary(): Promise<MovementsSummary> {
    const res = await axiosInstance.get(endpoints.inventory.movementsSummary);
    return res.data.data;
  },
};
