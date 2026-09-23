'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import type { PlatformBranding } from 'src/shared/lib/branding';

import { extractApiError } from './api-errors';
import { notify } from './notify';

type Props = {
  children: ReactNode;
  /**
   * Branding precargado del servidor (ver fetchPublicBranding en layout.tsx).
   * Siembra la caché ANTES del primer render, así useBranding() (Logo, etc.)
   * arranca con el dato real — sin flash "default → real". Único lugar donde
   * se configura esto; el resto de la app solo usa el hook. El favicon no
   * pasa por acá — tiene su propia ruta dinámica (app/api/favicon/route.ts).
   */
  initialBranding?: PlatformBranding | null;
};

export function QueryProvider({ children, initialBranding }: Props) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          notify.error(extractApiError(error));
        },
        onSuccess: (_data, _variables, _context, mutation) => {
          const msg = mutation.meta?.successMessage;
          if (msg) notify.success(msg);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 0,
          gcTime: 10 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            const status = (error as Error & { status?: number })?.status;
            if (status !== undefined && status >= 400 && status < 500) return false;
            return failureCount < 1;
          },
        },
      },
    });

    if (initialBranding) {
      client.setQueryData(queryKeys.branding.public, initialBranding);
    }

    return client;
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
