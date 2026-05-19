'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setCurrencyPreferences } from 'src/lib/currency';
import { queryKeys } from 'src/lib/query-keys';

import { localizationService } from '../services/localization.service';
import type { LocalizationConfig } from '../types/settings.types';

export function useLocalization() {
  const queryClient = useQueryClient();

  const { data: config = null, isLoading } = useQuery({
    queryKey: queryKeys.settings.localization,
    staleTime: 0,
    queryFn: async () => {
      const res = await localizationService.get();
      const payload = (res as Record<string, unknown>)?.data ?? res;
      if (payload) {
        const prefs = {
          currency: (payload as Record<string, unknown>).currency as string,
          locale: (payload as Record<string, unknown>).locale as string,
        };
        // Set both scopes so platform views (plans, billing) also have currency info
        setCurrencyPreferences(prefs, 'tenant');
        setCurrencyPreferences(prefs, 'platform');
      }
      return payload as LocalizationConfig;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<LocalizationConfig>) => {
      const res = await localizationService.update(data as Record<string, unknown>);
      const payload = (res as Record<string, unknown>)?.data ?? res;
      if (payload) {
        const prefs = {
          currency: (payload as Record<string, unknown>).currency as string,
          locale: (payload as Record<string, unknown>).locale as string,
        };
        setCurrencyPreferences(prefs, 'tenant');
        setCurrencyPreferences(prefs, 'platform');
      }
      return payload as LocalizationConfig;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.settings.localization }),
  });

  return {
    config,
    isLoading,
    isSaving: saveMutation.isPending,
    saveConfig: async (data: Partial<LocalizationConfig>): Promise<boolean> => {
      await saveMutation.mutateAsync(data);
      return true;
    },
  };
}
