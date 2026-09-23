// Importamos las dos versiones del isotipo (clara/oscura) para contraste automático
import logoWhiteImg from 'src/assets/logos/logo-white.webp';
import logoDarkImg from 'src/assets/logos/logo-dark.webp';
import { cn } from 'src/lib/utils';
// Tipografía propia del wordmark (independiente de la fuente configurable de la UI en ui.store)
import '@fontsource/sora/800.css';

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

/** Celeste tomado de la barra central del isotipo — fijo, no depende del theme */
const ACCENT_BLUE = '#2dc4ea';

/**
 * Logo global de la aplicación.
 *
 * Por defecto (background="auto") renderiza ambas versiones del isotipo y
 * alterna su visibilidad/color con las clases `dark:` de Tailwind (estrategia
 * por clase, ver ThemeProvider) Y con `.sidebar-dark` (ver layout-section.tsx):
 * el color del sidebar es una preferencia independiente del theme global
 * (navColor en ui.store), así que el logo sigue ambos ancestros.
 *
 * Cuando el contenedor tiene un fondo fijo que NO sigue el theme global
 * (ej: las tarjetas de auth, siempre bg-white), pasar background="light" o
 * "dark" para forzar el isotipo correcto sin depender de esas clases.
 */
export function Logo({
  variant = 'logo',
  height = 80,
  background = 'auto',
  className,
}: LogoProps) {
  const showDarkMark = background === 'light' || background === 'auto';
  const showWhiteMark = background === 'dark' || background === 'auto';
  const isAuto = background === 'auto';

  const baseTextColorClass =
    background === 'light'
      ? 'text-[#032162]'
      : background === 'dark'
        ? 'text-white'
        : 'text-[#032162] dark:text-white [.sidebar-dark_&]:text-white';

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {showDarkMark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoDarkImg.src}
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
          src={logoWhiteImg.src}
          alt="Logo"
          height={height}
          style={{ height: `${height}px`, width: 'auto' }}
          className={isAuto ? 'hidden dark:block [.sidebar-dark_&]:block' : undefined}
          draggable={false}
        />
      )}
      {variant === 'full' && (
        <span
          className="tracking-tight leading-none"
          style={{ fontSize: `${height * 0.48}px`, fontFamily: '"Sora", sans-serif', fontWeight: 800 }}
        >
          <span className={baseTextColorClass}>Vende </span>
          <span style={{ color: ACCENT_BLUE }}>más</span>
        </span>
      )}
    </div>
  );
}
