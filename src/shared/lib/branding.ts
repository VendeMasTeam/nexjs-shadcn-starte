import axiosInstance, { endpoints } from 'src/lib/axios';

export type PlatformBranding = {
  name: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
};

/**
 * Fetch server-safe (sin 'use client') — se usa desde el Server Component raíz
 * (layout.tsx) para precargar la caché de React Query antes del primer render,
 * y desde el hook de cliente (use-branding.ts) como queryFn. Una sola
 * implementación, un solo lugar para tocar si cambia el endpoint.
 *
 * Sin cache() de React acá a propósito: ese API es solo para Server Components,
 * y este módulo también lo importa use-branding.ts ('use client'). El dedup
 * server-side (generateMetadata + RootLayout) se hace en layout.tsx, que es
 * 100% server y no termina en el bundle de cliente.
 */
export async function fetchPublicBranding(): Promise<PlatformBranding | null> {
  try {
    const res = await axiosInstance.get(endpoints.branding.public);
    return res.data?.data ?? res.data;
  } catch {
    return null;
  }
}
