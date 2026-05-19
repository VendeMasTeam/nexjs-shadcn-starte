import axiosInstance, { endpoints } from 'src/lib/axios';
import type { PaginationParams } from 'src/shared/lib/pagination';

import type { CatalogProduct, CreateCatalogProductPayload } from '../types/catalog.types';

export const catalogService = {
  async getPaginated(
    params?: PaginationParams & {
      search?: string;
      type?: 'product' | 'service';
      status?: 'active' | 'inactive';
    }
  ): Promise<unknown> {
    const res = await axiosInstance.get(endpoints.catalog.products, { params });
    return res.data;
  },

  async getList(params?: {
    search?: string;
    type?: 'product' | 'service';
    status?: 'active' | 'inactive';
  }): Promise<CatalogProduct[]> {
    const res = await axiosInstance.get(endpoints.catalog.products, { params });
    return (res.data?.data ?? res.data) as CatalogProduct[];
  },

  async getOne(uid: string): Promise<CatalogProduct> {
    const res = await axiosInstance.get(endpoints.catalog.product(uid));
    return res.data.data;
  },

  async create(data: CreateCatalogProductPayload): Promise<CatalogProduct> {
    const res = await axiosInstance.post(endpoints.catalog.products, data);
    return res.data.data;
  },

  async update(uid: string, data: Partial<CreateCatalogProductPayload>): Promise<CatalogProduct> {
    const res = await axiosInstance.put(endpoints.catalog.product(uid), data);
    return res.data.data;
  },

  async deactivate(uid: string): Promise<CatalogProduct> {
    const res = await axiosInstance.delete(endpoints.catalog.product(uid));
    return res.data.data;
  },
};
