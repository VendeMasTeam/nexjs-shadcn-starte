'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantsService } from 'src/features/admin/services/tenants.service';
import { Tenant } from 'src/features/admin/types/admin.types';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

interface TenantFilters {
  search?: string;
  plan_uid?: string;
  estado?: string;
}

export function useTenants(filters: TenantFilters = {}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pagination = usePaginationParams();
  const { params, setTotal } = pagination;

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = {
        ...params,
        ...(filters.search && { search: filters.search }),
        ...(filters.plan_uid && { plan_uid: filters.plan_uid }),
        ...(filters.estado && { estado: filters.estado }),
      };
      const res = await tenantsService.getAll(queryParams);
      const meta = extractPaginationMeta(res);
      if (meta) setTotal(meta.total);
      const data = ((res as unknown as { data?: Tenant[] }).data ?? []) as Tenant[];
      setTenants(data);
    } finally {
      setIsLoading(false);
    }
  }, [params, filters.search, filters.plan_uid, filters.estado, setTotal]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const createTenant = useCallback(
    async (
      data: Omit<Tenant, 'uid' | 'created_at' | 'last_access_at'>,
      adminUser?: { name: string; email: string; role?: string }
    ): Promise<{ reset_email_sent?: boolean }> => {
      const created = await tenantsService.create(data);
      let reset_email_sent: boolean | undefined;
      if (adminUser?.name && adminUser?.email) {
        const result = await tenantsService
          .createUser(created.uid, {
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role || 'owner',
          })
          .catch(() => ({ reset_email_sent: false }));
        reset_email_sent = result.reset_email_sent;
      }
      await fetchTenants();
      return { reset_email_sent };
    },
    [fetchTenants]
  );

  const updateTenant = useCallback(
    async (uid: string, data: Partial<Tenant>) => {
      await tenantsService.update(uid, data);
      await fetchTenants();
    },
    [fetchTenants]
  );

  const suspendTenant = useCallback(
    async (uid: string) => {
      try {
        await tenantsService.suspend(uid);
        notify.success('Tenant suspendido.');
        await fetchTenants();
      } catch (error) {
        notify.error(extractApiError(error));
      }
    },
    [fetchTenants]
  );

  const activateTenant = useCallback(
    async (uid: string) => {
      try {
        await tenantsService.activate(uid);
        notify.success('Tenant activado.');
        await fetchTenants();
      } catch (error) {
        notify.error(extractApiError(error));
      }
    },
    [fetchTenants]
  );

  const archiveTenant = useCallback(
    async (uid: string) => {
      try {
        await tenantsService.archive(uid);
        notify.success('Tenant archivado.');
        await fetchTenants();
      } catch (error) {
        notify.error(extractApiError(error));
      }
    },
    [fetchTenants]
  );

  const restoreTenant = useCallback(
    async (uid: string) => {
      try {
        await tenantsService.restore(uid);
        notify.success('Tenant restaurado.');
        await fetchTenants();
      } catch (error) {
        notify.error(extractApiError(error));
      }
    },
    [fetchTenants]
  );

  // No atrapa errores acá: el caller (drawer) necesita saber si falló para no
  // cerrar el panel — esta acción es irreversible, no queremos cerrar en falso.
  const purgeTenant = useCallback(
    async (uid: string, confirmation: string) => {
      await tenantsService.purge(uid, confirmation);
      notify.success('Tenant eliminado definitivamente.');
      await fetchTenants();
    },
    [fetchTenants]
  );

  const createTenantUser = useCallback(
    async (tenantUid: string, data: { name: string; email: string; role: string }) => {
      return tenantsService.createUser(tenantUid, data);
    },
    []
  );

  return {
    tenants,
    isLoading,
    refetch: fetchTenants,
    createTenant,
    updateTenant,
    suspendTenant,
    activateTenant,
    archiveTenant,
    restoreTenant,
    purgeTenant,
    createTenantUser,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
