'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { init } from 'src/features/auth/services/auth.service';
import { setCurrencyPreferences } from 'src/lib/currency';
import type { AuthState, Module, PlanFeatures, TenantInfo } from 'src/shared/auth/types';

import { AuthContext } from '../auth-context';
import { isValidToken, setSession } from './utils';

type Props = { children: ReactNode };

/** Fallback: derive permissions from modules when backend doesn't return them yet */
function derivePermissions(modules: Module[]): string[] {
  return modules.flatMap((m) => m.permissions.map((p) => `${m.key}.${p}`));
}

const FEATURES_FALLBACK: PlanFeatures = {
  inventory: true,
  reports: true,
  multicurrency: true,
  custom_fields: true,
};

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    loading: true,
    permissions: [],
    modules: [],
    features: FEATURES_FALLBACK,
  });

  const checkUserSession = useCallback(async () => {
    try {
      const accessToken =
        sessionStorage.getItem('accessToken') || sessionStorage.getItem('jwt_access_token');

      if (accessToken && isValidToken(accessToken)) {
        setSession(accessToken);

        const data = await init();
        const payload = data?.data ?? data;
        const {
          user,
          modules,
          localization: loc,
          permissions: permsPayload,
          tenant,
          features,
        } = payload;

        if (user) {
          // Set currency preferences from auth/init localization
          if (loc?.currency && loc?.locale) {
            const prefs = { currency: loc.currency, locale: loc.locale };
            setCurrencyPreferences(prefs, 'tenant');
            setCurrencyPreferences(prefs, 'platform');
          }

          // Prefer backend-provided permissions (GET /auth/init now includes them).
          // Fall back to deriving from modules if the backend hasn't been deployed yet.
          const permissions: string[] = permsPayload?.effective?.length
            ? permsPayload.effective
            : derivePermissions(modules);

          const tenantInfo: TenantInfo | null = tenant
            ? { uid: tenant.uid, name: tenant.name, plan: tenant.plan, logo_url: tenant.logo_url }
            : null;

          setState({
            user: {
              uid: user.uid,
              name: user.name ?? '',
              email: user.email ?? '',
              role: user.role,
              tenant_uid: user.tenant_uid,
              tenant_plan: tenant?.plan ?? '',
              two_factor_enabled: user.two_factor_enabled,
              permissions,
            },
            tenant: tenantInfo,
            permissions,
            modules,
            features: features ?? FEATURES_FALLBACK,
            loading: false,
          });
          return { permissions, modules, role: user.role };
        } else {
          setState({
            user: null,
            tenant: null,
            loading: false,
            permissions: [],
            modules: [],
            features: FEATURES_FALLBACK,
          });
        }
      } else {
        setState({
          user: null,
          tenant: null,
          loading: false,
          permissions: [],
          modules: [],
          features: FEATURES_FALLBACK,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Auth] Session check failed:', (error as Error)?.message ?? 'Unknown error');
      }
      setState({
        user: null,
        tenant: null,
        loading: false,
        permissions: [],
        modules: [],
        features: FEATURES_FALLBACK,
      });
    }
    return { permissions: [], modules: [], role: undefined };
  }, []);

  useEffect(() => {
    async function init() {
      await checkUserSession();
    }
    init();
  }, [checkUserSession]);

  const hasPermission = useCallback(
    (key: string) => state.permissions.includes(key),
    [state.permissions]
  );

  const hasFeature = useCallback((key: string) => state.features[key] ?? true, [state.features]);

  const memoizedValue = useMemo(
    () => ({
      user: state.user,
      tenant: state.tenant,
      loading: state.loading,
      permissions: state.permissions,
      modules: state.modules,
      features: state.features,
      hasPermission,
      hasFeature,
      authenticated: state.user !== null,
      unauthenticated: state.user === null,
      checkUserSession,
    }),
    [
      state.user,
      state.tenant,
      state.loading,
      state.permissions,
      state.modules,
      state.features,
      hasPermission,
      hasFeature,
      checkUserSession,
    ]
  );

  return <AuthContext.Provider value={memoizedValue}>{children}</AuthContext.Provider>;
}
