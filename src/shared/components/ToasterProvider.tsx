'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

export function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster position="top-right" richColors theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
  );
}
