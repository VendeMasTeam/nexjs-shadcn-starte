'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'src/routes/hooks';

import { BrandLoader } from '../../components/feedback/BrandLoader';
import { useAuthContext } from '../hooks/use-auth-context';
import { canAccessPath, getFirstAccessibleRoute } from '../route-access';

type Props = { children: ReactNode };

/**
 * RouteGuard — wraps the authenticated layout.
 *
 * Behavior:
 * 1. While auth is loading → show spinner
 * 2. If user is NOT authenticated → AuthGuard (parent) handles redirect to login
 * 3. If user CAN access current path → render children
 * 4. If user CANNOT access current path → redirect to first accessible module
 *
 * Follows the pattern used by Salesforce (redirect to default) and HubSpot
 * (role-based routing). No 403 page — just silently redirect to where the
 * user SHOULD be.
 */
export function RouteGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, loading, user, modules } = useAuthContext();

  useEffect(() => {
    if (loading || !authenticated) return;

    // Skip redirect for auth pages and root
    if (pathname === '/' || pathname.startsWith('/auth')) return;

    if (!canAccessPath(pathname, modules, user?.role)) {
      const target = getFirstAccessibleRoute(modules, user?.role);
      router.replace(target);
    }
  }, [loading, authenticated, modules, pathname, router, user?.role]);

  if (loading || !authenticated) {
    return <BrandLoader />;
  }

  // Block render synchronously — useEffect redirect fires after paint, causing skeleton flash
  if (!canAccessPath(pathname, modules, user?.role)) {
    return null;
  }

  return <>{children}</>;
}
