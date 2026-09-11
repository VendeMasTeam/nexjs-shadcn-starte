import { useAuthContext } from './use-auth-context';

export function usePermissions() {
  const { permissions, adminPermissions, hasPermission, hasAdminPermission } = useAuthContext();
  return {
    // Permisos de TENANT (módulos del tenant: users.manage, opportunities.read, etc.)
    permissions,
    hasPermission,
    can: hasPermission,
    // Permisos de PLATAFORMA/superadmin/soporte (admin.tenants.purge, admin.tenants.support, etc.)
    adminPermissions,
    hasAdminPermission,
    canAdmin: hasAdminPermission,
  };
}
