'use client';

import React, { useState } from 'react';
import { usePermissions } from 'src/shared/auth/hooks/use-permissions';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatsCard,
} from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useUserStatusOptions } from 'src/shared/hooks/use-status-options';
import { useDebounce } from 'use-debounce';

import { UserDrawer } from '../components/users/user-drawer';
import { UsersTable } from '../components/users/users-table';
import { useRoles } from '../hooks/use-roles';
import { useSettingsUsers, useUser } from '../hooks/use-settings-users';
import type { SettingsUser } from '../types/settings.types';

export const UsersView = () => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterRoleLabel, setFilterRoleLabel] = useState('');
  const [roleFilterSearch, setRoleFilterSearch] = useState('');
  const [debouncedRoleFilterSearch] = useDebounce(roleFilterSearch, 400);
  const [filterStatus, setFilterStatus] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SettingsUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettingsUser | null>(null);
  const [resetTwoFactorTarget, setResetTwoFactorTarget] = useState<SettingsUser | null>(null);

  const { can } = usePermissions();
  const canManageUsers = can('users.manage');

  const [debouncedSearch] = useDebounce(search, 400);

  const {
    users,
    summary,
    isLoading,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
    resetTwoFactor,
    pagination,
  } = useSettingsUsers({
    search: debouncedSearch || undefined,
    role_uid: filterRole || undefined,
    estado: filterStatus || undefined,
  });

  const { roles } = useRoles({ search: debouncedRoleFilterSearch || undefined });
  const { data: userStatuses = [] } = useUserStatusOptions();

  // Fetch fresh user data (with role_uid/team_uid) when editing
  const { data: editingUser } = useUser(selectedUser?.uid);
  const effectiveUser = editingUser ?? selectedUser;

  // Agregado del backend sobre TODOS los usuarios del tenant — no depende de la página actual.
  const stats = {
    total: summary?.total_users ?? pagination.total,
    activos: summary?.active_users ?? 0,
    inactivos: summary?.inactive_users ?? 0,
  };

  const handleOpenNew = () => {
    setSelectedUser(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (user: SettingsUser) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  const handleSave = async (data: Omit<SettingsUser, 'uid' | 'created_at' | 'last_login_at'>) => {
    if (selectedUser) return updateUser(selectedUser.uid, data);
    return createUser(data);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios y sus accesos al sistema"
        action={
          <Button color="primary" onClick={handleOpenNew} className="gap-2">
            <Icon name="Plus" size={16} />
            Invitar usuario
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total"
          value={stats.total}
          trend="registrados"
          trendUp
          icon={<Icon name="Users" size={20} />}
          iconClassName="bg-blue-500/10 text-blue-600"
        />
        <StatsCard
          title="Activos"
          value={stats.activos}
          trend="en esta página"
          trendUp
          icon={<Icon name="UserCheck" size={20} />}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard
          title="Inactivos"
          value={stats.inactivos}
          trend="en esta página"
          trendUp={false}
          icon={<Icon name="UserX" size={20} />}
          iconClassName="bg-gray-500/10 text-gray-500"
        />
      </div>

      <SectionCard noPadding>
        <div className="flex flex-col sm:flex-row gap-3 items-end px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={16} />}
            className="flex-1 max-w-sm"
          />
          <div className="flex items-end gap-3">
            <SelectField
              label="Rol"
              searchable
              onSearch={setRoleFilterSearch}
              options={(() => {
                const base = [
                  { value: '', label: 'Todos los roles' },
                  ...roles.map((r) => ({ value: r.uid, label: r.name })),
                ];
                if (filterRole && filterRoleLabel && !base.find((o) => o.value === filterRole)) {
                  return [{ value: filterRole, label: filterRoleLabel }, ...base];
                }
                return base;
              })()}
              value={filterRole}
              onChange={(v) => {
                const r = roles.find((role) => role.uid === v);
                if (r) setFilterRoleLabel(r.name);
                setRoleFilterSearch('');
                setFilterRole(v as string);
              }}
            />
            <SelectField
              label="Estado"
              options={[{ value: '', label: 'Todos' }, ...userStatuses]}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as string)}
            />
          </div>
        </div>
        {isLoading && users.length === 0 ? (
          <div className="flex flex-col gap-4 p-5 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 rounded-lg w-full" />
            ))}
          </div>
        ) : (
          <UsersTable
            users={users}
            onEdit={handleEdit}
            onToggleStatus={(u: SettingsUser) => toggleStatus(u.uid)}
            onDelete={(u: SettingsUser) => setDeleteTarget(u)}
            onResetTwoFactor={canManageUsers ? (u) => setResetTwoFactorTarget(u) : undefined}
            total={pagination.total}
            pageIndex={pagination.page - 1}
            pageSize={pagination.rowsPerPage}
            onPageChange={(pi) => pagination.onChangePage(pi + 1)}
            onPageSizeChange={pagination.onChangeRowsPerPage}
          />
        )}
      </SectionCard>

      <UserDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={effectiveUser}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteUser(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar usuario?"
        description={
          <>
            Vas a eliminar a <strong>{deleteTarget?.name}</strong>. Esta acción no se puede
            deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />

      <ConfirmDialog
        open={!!resetTwoFactorTarget}
        onClose={() => setResetTwoFactorTarget(null)}
        onConfirm={() => {
          if (resetTwoFactorTarget) resetTwoFactor(resetTwoFactorTarget.uid);
          setResetTwoFactorTarget(null);
        }}
        title="¿Resetear 2FA?"
        description={
          <>
            <strong>{resetTwoFactorTarget?.name}</strong> podrá iniciar sesión solo con email y
            contraseña, y deberá activar 2FA nuevamente desde su perfil si lo desea.
          </>
        }
        confirmLabel="Resetear 2FA"
        variant="warning"
      />
    </PageContainer>
  );
};
