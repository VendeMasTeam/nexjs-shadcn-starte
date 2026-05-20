'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Route Access — Path-to-module mapping for permission-based routing
//
// Maps every frontend route to its backend module key.
// Used by RouteGuard to determine if a user can access a given path.
// ─────────────────────────────────────────────────────────────────────────────

import type { Module } from './types';

/** Maps a route path prefix to the backend module key */
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/inventory': 'inventory',
  '/sales': 'sales',
  '/reports': 'reports',
  '/hr/commissions': 'incentives',
  '/projects': 'projects',
  '/settings': 'settings',
  '/contacts': 'crm',
  '/schedule': 'crm',
  '/partners': 'partners',
  '/intelligence': 'intelligence',
  '/automation': 'automation',
  '/expenses': 'expenses',
  '/purchases': 'purchases',
  '/admin': 'admin',
};

/**
 * Canonical first-route per module, following NAV_CONFIG order.
 * When redirecting a user with no access, we pick the first enabled module
 * and navigate to its default route.
 */
const MODULE_DEFAULT_ROUTES: Record<string, string> = {
  admin: '/admin/dashboard',
  dashboard: '/dashboard',
  inventory: '/inventory/products',
  sales: '/sales/pipeline',
  reports: '/reports/inventory',
  incentives: '/hr/commissions/plans',
  projects: '/projects',
  settings: '/settings/users',
  crm: '/contacts',
  partners: '/partners',
  intelligence: '/intelligence/battlecards',
  automation: '/automation/rules',
  expenses: '/expenses',
  purchases: '/purchases',
};

/** Order of modules matching NAV_CONFIG — used to pick the first accessible one */
const MODULE_ORDER: string[] = [
  'dashboard',
  'inventory',
  'sales',
  'reports',
  'incentives',
  'projects',
  'settings',
  'crm',
  'partners',
  'intelligence',
  'automation',
  'expenses',
  'purchases',
];

/**
 * Returns the module key for a given path, or undefined if not found.
 */
export function getModuleForPath(path: string): string | undefined {
  // Sort by longest prefix first to match /sales/finance before /sales
  const prefixes = Object.keys(ROUTE_MODULE_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      return ROUTE_MODULE_MAP[prefix];
    }
  }
  return undefined;
}

/**
 * Checks if the user can access a given route path.
 * - Platform admins (role === 'platform-admin') can always access /admin/* routes
 * - For tenant routes: checks if the module is enabled in auth/init modules[]
 */
export function canAccessPath(path: string, modules: Module[], userRole?: string): boolean {
  // Admin SaaS routes — only platform admins
  if (path.startsWith('/admin')) {
    return userRole === 'platform-admin';
  }

  // App routes available to all authenticated users regardless of plan
  const ALWAYS_ALLOWED = ['/profile'];
  if (ALWAYS_ALLOWED.some((p) => path.startsWith(p))) return true;

  // Tenant routes — deny if no mapping or module disabled
  const moduleKey = getModuleForPath(path);
  if (!moduleKey) return false;

  const mod = modules.find((m) => m.key === moduleKey);
  return mod?.enabled === true;
}

/**
 * Returns the path of the first module the user CAN access, following NAV_CONFIG order.
 * Platform admins get redirected to /admin/dashboard.
 */
export function getFirstAccessibleRoute(modules: Module[], userRole?: string): string {
  // Platform admin → Admin SaaS
  if (userRole === 'platform-admin') return '/admin/dashboard';

  // Tenant user → first enabled module in order
  for (const key of MODULE_ORDER) {
    const mod = modules.find((m) => m.key === key);
    if (mod?.enabled) {
      return MODULE_DEFAULT_ROUTES[key] ?? '/dashboard';
    }
  }

  // Fallback — should never happen if user has at least one module
  return '/dashboard';
}
