'use client';

import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import { useExitSupportMode } from 'src/shared/auth/hooks/use-exit-support-mode';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';

function formatExpiry(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function SupportModeBanner() {
  const { supportMode } = useAuthContext();
  const { exit, isExiting } = useExitSupportMode();

  if (!supportMode?.active) return null;

  const expiry = formatExpiry(supportMode.expires_at);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <Icon name="Eye" size={16} className="shrink-0" />
      <span>
        Modo soporte activo: <strong>{supportMode.tenant_name}</strong>. Solo lectura.
        {expiry ? ` Expira a las ${expiry}.` : ''}
      </span>
      <Button
        size="sm"
        variant="outline"
        // Overrides repetidos en dark: a propósito — el variant "outline" trae dark:bg-input/30
        // y hover:text-accent-foreground, que sin esto ganan y funden el botón (o el texto) contra
        // el bg-amber-500 fijo del banner, que no sigue el theme
        className="border-amber-950/40 bg-white/40 text-amber-950 hover:bg-white/60 hover:text-amber-950 dark:bg-white/40 dark:hover:bg-white/60"
        onClick={exit}
        loading={isExiting}
      >
        Salir de soporte
      </Button>
    </div>
  );
}
