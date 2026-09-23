'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from 'src/lib/utils';
import { useUiStore } from 'src/store/ui.store';

import { Icon } from './ui';

type Props = { className?: string };

/**
 * Toggle claro/oscuro standalone (fuera del Settings drawer) — pensado para
 * pantallas sin sidebar, como las de auth. Sigue el mismo patrón que
 * SettingsDrawer.handleThemeChange: actualiza next-themes Y ui.store juntos
 * para no divergir. Con guard de montaje: next-themes no resuelve el theme
 * real hasta el cliente, evita mismatch de hidratación / ícono incorrecto.
 */
export function ThemeToggle({ className }: Props) {
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { setTheme } = useUiStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect

  if (!mounted) {
    return <div className={cn('size-9', className)} />;
  }

  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    setNextTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/50',
        className
      )}
    >
      <Icon name={isDark ? 'Sun' : 'Moon'} size={17} />
    </button>
  );
}
