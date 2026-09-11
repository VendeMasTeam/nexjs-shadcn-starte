import { useAuthContext } from './use-auth-context';

export function useUserRole() {
  const { user, hasPermission, hasAdminPermission, permissions } = useAuthContext();

  // admin.* / superadmin.* son permisos de PLATAFORMA — viven en admin_permissions, no en
  // permissions.effective (que siempre viene vacío para sesiones de plataforma/soporte).
  const isAdmin = hasAdminPermission('admin.read') || hasAdminPermission('admin.manage');
  const isSuperAdmin = hasAdminPermission('superadmin.manage');

  return { user, isAdmin, isSuperAdmin, permissions, hasPermission };
}
