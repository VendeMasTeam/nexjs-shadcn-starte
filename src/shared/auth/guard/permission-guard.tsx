'use client';

import { ReactNode } from 'react';

import { useAuthContext } from '../hooks/use-auth-context';

type Props = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

function AccessDenied() {
  return (
    <div className="flex flex-col justify-center items-center p-8 bg-background">
      <h3 className="text-xl font-bold mb-2">Acceso restringido</h3>
      <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
    </div>
  );
}

export function PermissionGuard({ permission, children, fallback }: Props) {
  const { hasPermission } = useAuthContext();

  if (!hasPermission(permission)) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}
