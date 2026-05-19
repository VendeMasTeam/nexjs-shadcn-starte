'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { extractApiError } from './api-errors';
import { notify } from './notify';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
