'use client';

import { ReactNode } from 'react';

import { useAuthContext } from '../hooks/use-auth-context';

type Props = {
  hasContent?: boolean;
  permissions?: string[];
  children: ReactNode;
};

export function RoleBasedGuard({ hasContent, permissions, children }: Props) {
  const { hasPermission } = useAuthContext();

  if (permissions?.length && !permissions.some((p) => hasPermission(p))) {
    return hasContent ? (
      <div className="flex flex-col justify-center items-center p-8 bg-background">
        <h3 className="text-xl font-bold mb-2">Acceso restringido</h3>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    ) : null;
  }

  return <>{children}</>;
}
