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
 */
export async function fetchPublicBranding(): Promise<PlatformBranding | null> {
  try {
    const res = await axiosInstance.get(endpoints.branding.public);
    return res.data?.data ?? res.data;
  } catch {
    return null;
  }
}
