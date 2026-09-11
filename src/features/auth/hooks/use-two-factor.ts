'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';

import { disableTwoFactor, regenerateRecoveryCodes } from '../services/auth.service';

export function useRegenerateRecoveryCodes() {
  return useMutation({
    mutationFn: async () => {
      const data = await regenerateRecoveryCodes();
      const payload = data?.data ?? data;
      return (payload.recovery_codes ?? []) as string[];
    },
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => disableTwoFactor(password),
    meta: { successMessage: '2FA desactivado correctamente' },
    // two_factor_enabled solo viene en GET /me — invalidamos ese query, no auth/init
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile.me }),
  });
}
