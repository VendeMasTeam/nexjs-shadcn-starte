'use client';

// Fallback bundleado — se usa mientras carga el branding remoto o si la plataforma no configuró logos propios
// Tipografía propia del wordmark (independiente de la fuente configurable de la UI en ui.store)
import '@fontsource/sora/800.css';

import logoDarkImg from 'src/assets/logos/logo-dark.webp';
import logoWhiteImg from 'src/assets/logos/logo-white.webp';
import { cn } from 'src/lib/utils';
import { useBranding } from 'src/shared/hooks/use-branding';

type LogoVariant = 'logo' | 'full';
/**
 * "auto"  → sigue el theme global de la app (dark: de Tailwind) y también
 *           `.sidebar-dark` (navColor del ui.store, independiente del theme)
 * "light" → fondo claro fijo (ignora el theme) → siempre usa el isotipo oscuro
 * "dark"  → fondo oscuro fijo (ignora el theme) → siempre usa el isotipo blanco
 */
type LogoBackground = 'auto' | 'light' | 'dark';

type LogoProps = {
  /** "logo" → solo isotipo | "full" → isotipo + nombre de marca */
  variant?: LogoVariant;
  /** Altura de la imagen. El ancho se ajusta de forma proporcional (auto). */
  height?: number;
  /**
   * Contraste del contenedor donde vive el logo.
   * Usar "light"/"dark" cuando el fondo NO sigue el theme global
   * (ej: tarjetas de auth con bg-white hardcodeado).
   */
  background?: LogoBackground;
  className?: string;
};

const DEFAULT_NAME = 'Vende más';

/**
 * Logo global de la aplicación — dinámico vía GET /platform/branding.
 *
 * Íconos: si la plataforma configuró logo_light_url/logo_dark_url (ver
 * PlatformBranding en use-branding.ts), se usan esas URLs; si no, cae al
 * isotipo bundleado. ASUNCIÓN a verificar contra el backend real: el sufijo
 * "_light"/"_dark" nombra el FONDO donde se usa cada logo (no el color del
 * propio isotipo) — logo_light_url se muestra sobre fondo claro (isotipo
 * oscuro) y logo_dark_url sobre fondo oscuro (isotipo claro), igual que nuestro
 * prop `background`. Si al probar contra la API real resulta invertido, el fix
 * es cambiar únicamente qué URL cae en cada slot de abajo.
 *
 * Texto: branding.name reemplaza "Vende más" (fallback mientras carga o si
 * falla el fetch). Si el cliente deja el nombre vacío a propósito (solo
 * quiere el isotipo), no se renderiza texto ni se reserva espacio para él.
 *
 * Por defecto (background="auto") alterna el isotipo/color con las clases
 * `dark:` de Tailwind Y con `.sidebar-dark` (ver layout-section.tsx): el color
 * del sidebar es una preferencia independiente del theme global (navColor en
 * ui.store), así que el logo sigue ambos ancestros.
 *
 * Cuando el contenedor tiene un fondo fijo que NO sigue el theme global
 * (ej: las tarjetas de auth, siempre bg-white), pasar background="light" o
 * "dark" para forzar el isotipo correcto sin depender de esas clases.
 */
export function Logo({ variant = 'logo', height = 80, background = 'auto', className }: LogoProps) {
  const { data: branding } = useBranding();

  const showDarkMark = background === 'light' || background === 'auto';
  const showWhiteMark = background === 'dark' || background === 'auto';
  const isAuto = background === 'auto';

  const lightBgLogoSrc = branding?.logo_light_url || logoDarkImg.src;
  const darkBgLogoSrc = branding?.logo_dark_url || logoWhiteImg.src;

  const baseTextColorClass =
    background === 'light'
      ? 'text-[#032162]'
      : background === 'dark'
        ? 'text-white'
        : 'text-[#032162] dark:text-white [.sidebar-dark_&]:text-white';

  // Mientras no resolvió el fetch (branding === undefined) mostramos el nombre
  // por defecto para evitar un flash sin texto. Una vez resuelto, un name
  // vacío es una decisión explícita del cliente (solo isotipo, sin texto).
  const trimmedName = branding?.name?.trim();
  const showText = variant === 'full' && (branding === undefined || !!trimmedName);
  const displayName = trimmedName || DEFAULT_NAME;

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {showDarkMark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lightBgLogoSrc}
          alt="Logo"
          height={height}
          style={{ height: `${height}px`, width: 'auto' }}
          className={isAuto ? 'block dark:hidden [.sidebar-dark_&]:hidden' : undefined}
          draggable={false}
        />
      )}
      {showWhiteMark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={darkBgLogoSrc}
          alt="Logo"
          height={height}
          style={{ height: `${height}px`, width: 'auto' }}
          className={isAuto ? 'hidden dark:block [.sidebar-dark_&]:block' : undefined}
          draggable={false}
        />
      )}
      {showText && (
        <span
          className={cn(
            'min-w-0 max-w-[18ch] truncate tracking-tight leading-none',
            baseTextColorClass
          )}
          style={{
            fontSize: `${height * 0.48}px`,
            fontFamily: '"Sora", sans-serif',
            fontWeight: 800,
          }}
          title={displayName}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
