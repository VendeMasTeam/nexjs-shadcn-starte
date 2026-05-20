'use client';

import React, { useState } from 'react';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { useDebounce } from 'use-debounce';

import { RoleDrawer } from '../components/roles/role-drawer';
import { RolesTable } from '../components/roles/roles-table';
import { useRoles } from '../hooks/use-roles';
import type { Role } from '../types/settings.types';

export const RolesView = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const { roles, isLoading, createRole, updateRole, deleteRole } = useRoles({
    search: debouncedSearch || undefined,
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const handleOpenNew = () => {
    setSelectedRole(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsDrawerOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    permission_uids: string[];
  }) => {
    if (selectedRole) return updateRole(selectedRole.uid, data);
    return createRole(data);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Roles y Permisos"
        subtitle="Define los niveles de acceso para cada tipo de usuario"
        action={
          <Button color="primary" onClick={handleOpenNew} className="gap-2">
            <Icon name="Plus" size={16} />
            Nuevo rol
          </Button>
        }
      />

      <SectionCard noPadding>
        <div className="flex flex-col sm:flex-row gap-3 items-end px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={16} />}
            className="flex-1 max-w-sm"
          />
        </div>
        {isLoading && roles.length === 0 ? (
          <div className="flex flex-col gap-4 p-5 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 rounded-lg w-full" />
            ))}
          </div>
        ) : (
          <>
            <RolesTable roles={roles} onEdit={handleEdit} onDelete={(r) => setDeleteTarget(r)} />
            <div className="border-t border-border/40 p-4 text-sm text-muted-foreground">
              {roles.length} rol{roles.length !== 1 ? 'es' : ''} configurado
              {roles.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </SectionCard>

      <RoleDrawer
        key={isDrawerOpen ? (selectedRole?.uid ?? 'new') : 'closed'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        role={selectedRole}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRole(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar rol?"
        description={
          <>
            Vas a eliminar <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
};
