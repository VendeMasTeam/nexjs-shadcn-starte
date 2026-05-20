'use client';

import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import type { PlanFeatures } from 'src/shared/auth/types';

export type { PlanFeatures };

export function useFeatures() {
  const { features, hasFeature, loading } = useAuthContext();

  return {
    features,
    isLoading: loading,
    hasFeature,
  };
}
