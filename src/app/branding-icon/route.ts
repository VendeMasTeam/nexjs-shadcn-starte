import { NextResponse } from 'next/server';
import { fetchPublicBranding } from 'src/shared/lib/branding';

// Sin cache de Next para esta ruta — el branding puede cambiar en cualquier momento
export const dynamic = 'force-dynamic';

/**
 * Favicon dinámico — layout.tsx apunta metadata.icons.icon acá (URL estable).
 * En cada request resolvemos el branding actual server-side y servimos
 * branding.favicon_url si existe; si no, redirige al ícono estático bundleado
 * (public/branding/default-favicon.png).
 *
 * Fuera de /api/ a propósito: en prod, ese prefijo lo captura el proxy hacia
 * el backend Laravel (ver traefik labels del docker-compose), así que una ruta
 * propia de Next.js ahí nunca llega a este server — 404 solo en producción.
 *
 * El default vive en public/, NO en app/icon.png a propósito: si existiera un
 * app/icon.png, Next generaría su PROPIO <link rel="icon"> por convención de
 * archivo, compitiendo con este endpoint — el estático (instantáneo) gana la
 * carrera inicial y después "salta" al dinámico cuando resuelve, que es
 * exactamente el flash que queremos evitar. Con una sola fuente no hay carrera.
 */
export async function GET(request: Request) {
  const branding = await fetchPublicBranding();

  if (branding?.favicon_url) {
    try {
      const res = await fetch(branding.favicon_url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': res.headers.get('content-type') ?? 'image/png',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }
    } catch {
      // cae al default de abajo
    }
  }

  const redirect = NextResponse.redirect(new URL('/branding/default-favicon.png', request.url));
  redirect.headers.set('Cache-Control', 'public, max-age=300');
  return redirect;
}
