'use client';

import { useQuery } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { queryKeys } from 'src/lib/query-keys';

export interface TenantOption {
  uid: string;
  name: string;
  key: string;
}

export function useLeadOrigins() {
  return useQuery({
    queryKey: queryKeys.tenant.leadOrigins,
    queryFn: () =>
      axiosInstance.get(endpoints.tenant.leadOrigins).then((r) => r.data?.data ?? r.data),
    staleTime: 0,
  });
}

export function useLostReasonCategories() {
  return useQuery({
    queryKey: queryKeys.tenant.lostReasonCategories,
    queryFn: () =>
      axiosInstance.get(endpoints.tenant.lostReasonCategories).then((r) => r.data?.data ?? r.data),
    staleTime: 0,
  });
}

export function useActivityTypes() {
  return useQuery({
    queryKey: queryKeys.tenant.activityTypes,
    queryFn: () =>
      axiosInstance.get(endpoints.tenant.activityTypes).then((r) => r.data?.data ?? r.data),
    staleTime: 0,
  });
}

export function useCompanySizes() {
  return useQuery({
    queryKey: queryKeys.tenant.companySizes,
    queryFn: () =>
      axiosInstance.get(endpoints.tenant.companySizes).then((r) => r.data?.data ?? r.data),
    staleTime: 0,
  });
}
