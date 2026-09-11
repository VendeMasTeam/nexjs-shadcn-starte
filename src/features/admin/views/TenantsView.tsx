'use client';

import React, { useState } from 'react';
import { SupportLoginDialog } from 'src/features/admin/components/support-login-dialog';
import { TenantDetailDrawer } from 'src/features/admin/components/tenant-detail-drawer';
import { TenantFormDrawer } from 'src/features/admin/components/tenant-form-drawer';
import { TenantsTable } from 'src/features/admin/components/tenants-table';
import { usePlansAdmin } from 'src/features/admin/hooks/use-plans-admin';
import { useTenants } from 'src/features/admin/hooks/use-tenants';
import { Tenant } from 'src/features/admin/types/admin.types';
import { usePermissions } from 'src/shared/auth/hooks/use-permissions';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useDebounce } from 'use-debounce';

export const TenantsView = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [filterPlan, setFilterPlan] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const {
    tenants,
    isLoading,
    createTenant,
    updateTenant,
    suspendTenant,
    activateTenant,
    archiveTenant,
    restoreTenant,
    purgeTenant,
    createTenantUser,
    pagination,
  } = useTenants({ search: debouncedSearch, plan_uid: filterPlan, estado: filterEstado });

  const { planes } = usePlansAdmin();
  const { hasAdminPermission } = usePermissions();
  const canSupport = hasAdminPermission('admin.tenants.support');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [supportLoginTarget, setSupportLoginTarget] = useState<Tenant | null>(null);
  const [prevTenants, setPrevTenants] = useState(tenants);

  // Mantiene el drawer abierto sincronizado con la lista: cada vez que una acción
  // (suspender/archivar/eliminar/etc.) refresca `tenants`, el tenant seleccionado
  // se actualiza con los datos frescos en vez de quedar con el estado viejo.
  if (tenants !== prevTenants) {
    setPrevTenants(tenants);
    if (selectedTenant) {
      const fresh = tenants.find((t) => t.uid === selectedTenant.uid);
      if (fresh) setSelectedTenant(fresh);
    }
  }

  const activeFiltersCount =
    (filterPlan ? 1 : 0) + (filterEstado ? 1 : 0) + (debouncedSearch ? 1 : 0);

  const handleOpenNew = () => {
    setSelectedTenant(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailOpen(true);
  };

  const handleFormSave = async (
    data: Record<string, unknown>,
    adminUser?: { name: string; email: string }
  ): Promise<{ reset_email_sent?: boolean }> => {
    if (selectedTenant) {
      await updateTenant(selectedTenant.uid, data as Partial<Tenant>);
      return {};
    }
    return createTenant(data as unknown as Tenant, adminUser);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilterPlan('');
    setFilterEstado('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        subtitle="Gestiona todos los clientes del sistema"
        action={
          <Button color="primary" onClick={handleOpenNew} className="gap-2">
            <Icon name="Plus" className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
      />

      <SectionCard noPadding className="flex flex-col shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre o dominio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" className="h-4 w-4" />}
            className="flex-1 w-full max-w-sm"
          />

          <div className="flex items-end gap-3 w-full sm:w-auto">
            <SelectField
              label="Plan"
              options={[
                { value: '', label: 'Todos los planes' },
                ...planes.map((p) => ({ value: p.uid, label: p.name })),
              ]}
              value={filterPlan}
              onChange={(v) => setFilterPlan(v as string)}
            />
            <SelectField
              label="Estado"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'ACTIVO', label: 'Activo' },
                { value: 'TRIAL', label: 'Trial' },
                { value: 'VENCIDO', label: 'Vencido' },
                { value: 'SUSPENDIDO', label: 'Suspendido' },
              ]}
              value={filterEstado}
              onChange={(v) => setFilterEstado(v as string)}
            />

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground h-10 px-3"
              >
                <Icon name="Filter" className="h-4 w-4 mr-2" />
                Limpiar <span className="ml-1 opacity-70">({activeFiltersCount})</span>
              </Button>
            )}
          </div>
        </div>
        <TenantsTable
          tenants={tenants}
          isLoading={isLoading}
          onEdit={handleOpenEdit}
          onViewDetail={handleOpenDetail}
          onSupportLogin={(t) => setSupportLoginTarget(t)}
          canSupport={canSupport}
          total={pagination.total}
          pageIndex={pagination.page - 1}
          pageSize={pagination.rowsPerPage}
          onPageChange={(pi) => pagination.onChangePage(pi + 1)}
          onPageSizeChange={pagination.onChangeRowsPerPage}
        />
      </SectionCard>

      <TenantFormDrawer
        tenant={selectedTenant}
        planes={planes}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleFormSave}
      />

      <TenantDetailDrawer
        tenant={selectedTenant}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSuspend={(t) => suspendTenant(t.uid)}
        onActivate={(t) => activateTenant(t.uid)}
        onArchive={(t) => archiveTenant(t.uid)}
        onRestore={(t) => restoreTenant(t.uid)}
        onPurge={(t, confirmation) => purgeTenant(t.uid, confirmation)}
        onCreateUser={createTenantUser}
      />

      <SupportLoginDialog tenant={supportLoginTarget} onClose={() => setSupportLoginTarget(null)} />
    </PageContainer>
  );
};
