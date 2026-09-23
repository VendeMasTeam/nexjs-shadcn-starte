import './globals.css';

import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import { cache } from 'react';

// Solo Geist Mono para elementos `font-mono` (código, monoespaciado).
// La fuente principal de la app la gestiona --font-app via globals.css + useSettings.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

import { QueryProvider } from 'src/lib/query-provider';
import { I18nProvider } from 'src/locales/i18n-provider';
import { detectLanguage } from 'src/locales/server';
import { AuthProvider } from 'src/shared/auth/context/jwt';
import { ProgressBar } from 'src/shared/components/ProgressBar';
import { ThemeProvider } from 'src/shared/components/ThemeProvider';
import { ToasterProvider } from 'src/shared/components/ToasterProvider';
import { fetchPublicBranding } from 'src/shared/lib/branding';

/**
 * cache() local (no en branding.ts): ese API es solo para Server Components,
 * y branding.ts también lo importa un hook 'use client'. Acá layout.tsx es
 * 100% server, así que generateMetadata y RootLayout (abajo) comparten un
 * solo fetch real por request en vez de pedir el branding dos veces.
 */
const getBranding = cache(fetchPublicBranding);

/**
 * generateMetadata (no `export const metadata` estático) porque el ícono
 * necesita versionarse con favicon_url: así, cuando el cliente sube un
 * favicon nuevo, la URL del <link rel="icon"> cambia y el navegador la trata
 * como un recurso distinto — evita el caché de favicon del navegador, que
 * ignora Cache-Control y se queda pegado al archivo viejo si la URL es fija.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const iconUrl = branding?.favicon_url
    ? `/branding-icon?v=${encodeURIComponent(branding.favicon_url)}`
    : '/branding-icon';

  return {
    title: 'CRM',
    description: 'Sistema de gestión empresarial',
    // Fuera de /api/: ese prefijo en prod lo captura el proxy hacia el backend Laravel
    icons: { icon: iconUrl },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [lang, initialBranding] = await Promise.all([detectLanguage(), getBranding()]);

  const SETTINGS_SCRIPT = `
  try {
    var stored = localStorage.getItem('crm-ui-settings');
    if (stored) {
      var state = JSON.parse(stored).state;
      var html = document.documentElement;
      if (state.bgVariant && state.bgVariant !== 'default') {
        html.classList.add('bg-' + state.bgVariant);
      }
      if (state.colorPreset && state.colorPreset !== 'indigo') {
        html.classList.add('preset-' + state.colorPreset);
      }
      if (state.fontFamily && state.fontFamily !== 'public-sans') {
        html.classList.add('font-' + state.fontFamily);
      }
      if (state.contrast === 'bold') {
        html.classList.add('contrast-bold');
      }
      if (state.fontSize) {
        html.style.fontSize = state.fontSize + 'px';
      }
    }
  } catch(e) {}
`;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ProgressBar />
          <I18nProvider lang={lang}>
            <QueryProvider initialBranding={initialBranding}>
              <AuthProvider>{children}</AuthProvider>
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
