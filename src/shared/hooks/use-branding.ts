'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';
import { fetchPublicBranding, type PlatformBranding } from 'src/shared/lib/branding';

export type { PlatformBranding };

/**
 * Branding de plataforma — GET /platform/branding (público, funciona sin sesión).
 * Se usa tanto en login (Logo, favicon) como en el resto de la app (sidebar).
 *
 * La caché arranca sembrada desde el servidor (ver QueryProvider +
 * fetchPublicBranding en layout.tsx), así este hook no parte de `undefined`
 * en el primer render — evita el flash "default → real". staleTime evita
 * refetch en cada navegación SPA; una recarga completa de página vuelve a
 * pedirlo del lado del servidor. `admin.tenants.manage` invalida esta query
 * al guardar cambios (ver branding.service.ts).
 */
export function useBranding() {
  return useQuery({
    queryKey: queryKeys.branding.public,
    queryFn: async (): Promise<PlatformBranding> => {
      const data = await fetchPublicBranding();
      if (!data) throw new Error('No se pudo obtener el branding');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
