'use client';

import { useQuery } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { queryKeys } from 'src/lib/query-keys';

export type MeProfile = {
  uid: string;
  name: string;
  email: string;
  avatar_url?: string;
  two_factor_enabled?: boolean;
};

// GET /me — única fuente de two_factor_enabled del propio usuario
// (GET /auth/init NO trae este campo, ver conversación con backend)
export function useMe() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.auth.me);
      return (res.data?.data ?? res.data) as MeProfile;
    },
    staleTime: 0,
  });
}
