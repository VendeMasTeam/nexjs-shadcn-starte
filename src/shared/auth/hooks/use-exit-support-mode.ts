'use client';

import { useState } from 'react';
import { stopSupportSession } from 'src/features/auth/services/auth.service';
import { paths } from 'src/routes/paths';

import { endSupportSession } from '../context/jwt/utils';

// Sale del modo soporte: avisa al backend (best-effort — si falla igual salimos
// localmente, no queremos dejar al admin atrapado) y hace un reload completo
// para que toda la app arranque de cero con el token de admin restaurado.
export function useExitSupportMode() {
  const [isExiting, setIsExiting] = useState(false);

  const exit = async () => {
    setIsExiting(true);
    try {
      await stopSupportSession();
    } catch {
      // ignorado a propósito — igual salimos del modo soporte del lado del cliente
    } finally {
      endSupportSession();
      window.location.assign(paths.admin.tenants);
    }
  };

  return { exit, isExiting };
}
