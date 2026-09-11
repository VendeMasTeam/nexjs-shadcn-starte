'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { formatDate } from 'src/lib/date';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import { usePermissions } from 'src/shared/auth/hooks/use-permissions';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatsCard,
} from 'src/shared/components/layouts/page';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeadCustom,
  TablePaginationCustom,
  TableRow,
  useTable,
} from 'src/shared/components/table';
import { Badge, Button, EditButton, Icon, Input, SelectField } from 'src/shared/components/ui';
import { MoreActionsMenu } from 'src/shared/components/ui/action-buttons';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';

import { PlatformUserFormDrawer } from '../components/platform-user-form-drawer';
import { usePlatformRoles } from '../hooks/use-platform-roles';
import { usePlatformUsers } from '../hooks/use-platform-users';
import type { PlatformUser, PlatformUserPayload, PlatformUserStatus } from '../types/admin.types';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PlatformUserStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'default' }
> = {
  ACTIVO: { label: 'Activo', color: 'success' },
  INACTIVO: { label: 'Inactivo', color: 'default' },
};

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<PlatformUser>();

interface UserColumnHandlers {
  onEdit: (user: PlatformUser) => void;
  onResetTwoFactor: (user: PlatformUser) => void;
  onToggleLock: (user: PlatformUser) => void;
  onPurge: (user: PlatformUser) => void;
  canPurge: boolean;
  currentUserUid?: string;
}

function buildUserColumns({
  onEdit,
  onResetTwoFactor,
  onToggleLock,
  onPurge,
  canPurge,
  currentUserUid,
}: UserColumnHandlers) {
  return [
    columnHelper.accessor('name', {
      header: 'Usuario',
      cell: (info) => (
        <div>
          <p className="text-body2 font-medium text-foreground">{info.getValue()}</p>
          <p className="text-caption text-muted-foreground">{info.row.original.email}</p>
        </div>
      ),
    }),
    columnHelper.accessor('admin_roles', {
      header: 'Roles',
      cell: (info) => {
        const roles = info.getValue();
        if (!roles.length) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <Badge key={r.uid} variant="outline" className="text-xs">
                {r.name}
              </Badge>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => {
        const cfg = STATUS_CONFIG[info.getValue()] ?? {
          label: info.getValue(),
          color: 'default' as const,
        };
        return (
          <Badge variant="soft" color={cfg.color}>
            {cfg.label}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('last_login_at', {
      header: 'Último acceso',
      cell: (info) => (
        <span className="text-body2 text-muted-foreground">
          {info.getValue() ? formatDate(info.getValue()!) : '—'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: (info) => {
        const user = info.row.original;
        const isSelf = !!currentUserUid && user.uid === currentUserUid;
        const isActive = user.status === 'ACTIVO';
        const toggleLockColor: 'error' | 'default' = isActive ? 'error' : 'default';
        return (
          <div className="flex items-center gap-1">
            <EditButton onClick={() => onEdit(user)} />
            <MoreActionsMenu
              items={[
                {
                  label: 'Resetear 2FA',
                  icon: <Icon name="ShieldOff" size={14} />,
                  color: 'warning',
                  onClick: () => onResetTwoFactor(user),
                },
                // Desactivar/Activar y Eliminar definitivamente son "acciones críticas"
                // según el doc — ambas requieren admin.tenants.purge, no solo el purge.
                ...(canPurge
                  ? [
                      {
                        label: isActive ? 'Desactivar' : 'Activar',
                        icon: <Icon name={isActive ? 'UserX' : 'UserCheck'} size={14} />,
                        color: toggleLockColor,
                        disabled: isActive && isSelf,
                        onClick: () => onToggleLock(user),
                      },
                      {
                        label: 'Eliminar definitivamente',
                        icon: <Icon name="Trash2" size={14} />,
                        color: 'error' as const,
                        disabled: isSelf,
                        onClick: () => onPurge(user),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        );
      },
    }),
  ];
}

// ─── View ─────────────────────────────────────────────────────────────────────

export function PlatformUsersView() {
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const {
    users,
    isLoading,
    createUser,
    updateUser,
    resetTwoFactor,
    lockUser,
    unlockUser,
    purgeUser,
    pagination,
  } = usePlatformUsers({
    admin_role_uid: filterRole !== 'all' ? filterRole : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });

  const { roles } = usePlatformRoles();
  const { hasPermission } = usePermissions();
  const { user: currentUser } = useAuthContext();
  const canPurge = hasPermission('admin.tenants.purge');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [resetTwoFactorTarget, setResetTwoFactorTarget] = useState<PlatformUser | null>(null);
  const [lockTarget, setLockTarget] = useState<PlatformUser | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<PlatformUser | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  const handleConfirmToggleLock = async () => {
    if (!lockTarget) return;
    try {
      if (lockTarget.status === 'ACTIVO') {
        await lockUser(lockTarget.uid);
      } else {
        await unlockUser(lockTarget.uid);
      }
      setLockTarget(null);
    } catch {
      // toast global ya muestra el error (p.ej. "no podés desactivar tu propio usuario")
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    setIsPurging(true);
    try {
      await purgeUser(purgeTarget.uid, purgeConfirmText);
      setPurgeTarget(null);
      setPurgeConfirmText('');
    } catch {
      // el toast de error ya lo muestra el mutationCache global — acá solo
      // evitamos que se cierre el modal para que el usuario pueda reintentar
    } finally {
      setIsPurging(false);
    }
  };

  const COLUMNS = useMemo(
    () =>
      buildUserColumns({
        onEdit: (user) => {
          setSelectedUser(user);
          setDrawerOpen(true);
        },
        onResetTwoFactor: (user) => setResetTwoFactorTarget(user),
        onToggleLock: (user) => setLockTarget(user),
        onPurge: (user) => setPurgeTarget(user),
        canPurge,
        currentUserUid: currentUser?.uid,
      }),
    [canPurge, currentUser?.uid]
  );

  const { table, dense, onChangeDense } = useTable({
    data: users,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const activeCount = users.filter((u) => u.status === 'ACTIVO').length;
  const inactiveCount = users.filter((u) => u.status === 'INACTIVO').length;

  const statsCards = [
    {
      title: 'Total Usuarios',
      value: pagination.total,
      icon: <Icon name="Users" size={18} />,
      iconClassName: 'bg-primary/10 text-primary',
      trend: 'en la plataforma',
      trendUp: true,
    },
    {
      title: 'Activos',
      value: activeCount,
      icon: <Icon name="UserCheck" size={18} />,
      iconClassName: 'bg-success/10 text-success',
      trend: 'usuarios activos',
      trendUp: true,
    },
    {
      title: 'Inactivos',
      value: inactiveCount,
      icon: <Icon name="UserX" size={18} />,
      iconClassName: 'bg-warning/10 text-warning',
      trend: 'sin acceso',
      trendUp: false,
    },
    {
      title: 'Roles activos',
      value: roles.length,
      icon: <Icon name="ShieldCheck" size={18} />,
      iconClassName: 'bg-info/10 text-info',
      trend: 'roles disponibles',
      trendUp: true,
    },
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'Todos los roles' },
    ...roles.map((r) => ({ value: r.uid, label: r.name })),
  ];

  const statusFilterOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Usuarios de Plataforma"
        subtitle="Gestioná los usuarios con acceso al panel administrador"
        action={
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              setSelectedUser(null);
              setDrawerOpen(true);
            }}
          >
            <Icon name="Plus" size={16} />
            Nuevo usuario
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconClassName={card.iconClassName}
            trend={card.trend}
            trendUp={card.trendUp}
          />
        ))}
      </div>

      <SectionCard noPadding>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por nombre o email..."
              value={pagination.search ?? ''}
              onChange={(e) => pagination.onChangeSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>
          <SelectField
            label="Rol"
            options={roleFilterOptions}
            value={filterRole}
            onChange={(v) => setFilterRole(v as string)}
          />
          <SelectField
            label="Estado"
            options={statusFilterOptions}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string)}
          />
        </div>

        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <div className="border-t border-border/40">
          <TablePaginationCustom table={table} dense={dense} onChangeDense={onChangeDense} />
        </div>
      </SectionCard>

      <PlatformUserFormDrawer
        open={drawerOpen}
        user={selectedUser}
        roles={roles}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedUser(null);
        }}
        onCreate={(data: PlatformUserPayload) => createUser(data)}
        onUpdate={(uid, data) => updateUser(uid, data)}
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
            contraseña, y deberá activar 2FA nuevamente si lo desea.
          </>
        }
        confirmLabel="Resetear 2FA"
        variant="warning"
      />

      <ConfirmDialog
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        onConfirm={handleConfirmToggleLock}
        title={lockTarget?.status === 'ACTIVO' ? '¿Desactivar usuario?' : '¿Activar usuario?'}
        description={
          lockTarget?.status === 'ACTIVO' ? (
            <>
              <strong>{lockTarget?.name}</strong> quedará bloqueado y se le revocarán sus sesiones.
              No se borran sus datos.
            </>
          ) : (
            <>
              <strong>{lockTarget?.name}</strong> vuelve a poder iniciar sesión normalmente.
            </>
          )
        }
        confirmLabel={lockTarget?.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        variant={lockTarget?.status === 'ACTIVO' ? 'error' : 'default'}
      />

      <Dialog open={!!purgeTarget} onOpenChange={(v) => !v && !isPurging && setPurgeTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar definitivamente a {purgeTarget?.name}</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se borra el registro del usuario, sus tokens, sus
              roles/permisos y sus sesiones de soporte asociadas.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            label={`Escribe exactamente el email "${purgeTarget?.email}" para confirmar:`}
            placeholder={purgeTarget?.email}
            disabled={isPurging}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)} disabled={isPurging}>
              Cancelar
            </Button>
            <Button
              className="bg-red-950 hover:bg-red-900 text-white"
              disabled={purgeConfirmText !== purgeTarget?.email}
              loading={isPurging}
              onClick={handleConfirmPurge}
            >
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
