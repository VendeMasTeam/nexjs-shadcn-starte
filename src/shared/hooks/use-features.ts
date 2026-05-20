'use client';

import { useQuery } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';

export interface PlanFeatures {
  inventory: boolean;
  reports: boolean;
  multicurrency: boolean;
  custom_fields: boolean;
  [key: string]: boolean;
}

const FALLBACK: PlanFeatures = {
  inventory: true,
  reports: true,
  multicurrency: true,
  custom_fields: true,
};

export function useFeatures() {
  const { data, isLoading } = useQuery<PlanFeatures>({
    queryKey: ['me', 'features'],
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.auth.meFeatures);
      return (res.data?.data ?? res.data) as PlanFeatures;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK,
  });

  return {
    features: data ?? FALLBACK,
    isLoading,
    hasFeature: (key: keyof PlanFeatures) => data?.[key] ?? true,
  };
}
