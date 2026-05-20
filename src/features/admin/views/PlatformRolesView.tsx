'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
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
import { Badge, Button, DeleteButton, EditButton, Icon, Input } from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';

import { PlatformRoleFormDrawer } from '../components/platform-role-form-drawer';
import { usePlatformRoles } from '../hooks/use-platform-roles';
import type { PlatformRole, PlatformRolePayload } from '../types/admin.types';

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<PlatformRole>();

interface RoleColumnHandlers {
  onEdit: (role: PlatformRole) => void;
  onDelete: (role: PlatformRole) => void;
}

function buildRoleColumns({ onEdit, onDelete }: RoleColumnHandlers) {
  return [
    columnHelper.accessor('name', {
      header: 'Rol',
      cell: (info) => (
        <div>
          <p className="text-body2 font-medium text-foreground">{info.getValue()}</p>
          <p className="text-caption text-muted-foreground line-clamp-1">
            {info.row.original.description}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor('permissions', {
      header: 'Permisos',
      cell: (info) => (
        <span className="text-body2 text-muted-foreground">{info.getValue().length}</span>
      ),
    }),
    columnHelper.accessor('total_users', {
      header: 'Usuarios',
      cell: (info) => <span className="text-body2">{info.getValue()}</span>,
    }),
    columnHelper.accessor('is_system', {
      header: 'Tipo',
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="soft" color="info">
            Sistema
          </Badge>
        ) : (
          <Badge variant="soft" color="default">
            Personalizado
          </Badge>
        ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: (info) => {
        const role = info.row.original;
        return (
          <div className="flex items-center gap-1">
            <EditButton onClick={() => onEdit(role)} />
            <DeleteButton onClick={() => onDelete(role)} disabled={role.is_system} />
          </div>
        );
      },
    }),
  ];
}

// ─── View ─────────────────────────────────────────────────────────────────────

export function PlatformRolesView() {
  const { roles, permissions, isLoading, createRole, updateRole, deleteRole, pagination } =
    usePlatformRoles();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PlatformRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformRole | null>(null);

  const COLUMNS = useMemo(
    () =>
      buildRoleColumns({
        onEdit: (role) => {
          setSelectedRole(role);
          setDrawerOpen(true);
        },
        onDelete: (role) => setDeleteTarget(role),
      }),
    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: roles,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const statsCards = [
    {
      title: 'Total de Roles',
      value: pagination.total,
      icon: <Icon name="ShieldCheck" size={18} />,
      iconClassName: 'bg-primary/10 text-primary',
      trend: 'en la plataforma',
      trendUp: true,
    },
    {
      title: 'Roles del Sistema',
      value: roles.filter((r) => r.is_system).length,
      icon: <Icon name="Lock" size={18} />,
      iconClassName: 'bg-info/10 text-info',
      trend: 'protegidos',
      trendUp: true,
    },
    {
      title: 'Roles Personalizados',
      value: roles.filter((r) => !r.is_system).length,
      icon: <Icon name="Settings" size={18} />,
      iconClassName: 'bg-success/10 text-success',
      trend: 'editables',
      trendUp: true,
    },
    {
      title: 'Permisos disponibles',
      value: permissions.length,
      icon: <Icon name="Shield" size={18} />,
      iconClassName: 'bg-warning/10 text-warning',
      trend: 'en el sistema',
      trendUp: false,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Roles de Plataforma"
        subtitle="Gestioná roles y permisos para usuarios de la plataforma"
        action={
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              setSelectedRole(null);
              setDrawerOpen(true);
            }}
          >
            <Icon name="Plus" size={16} />
            Nuevo rol
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
        <div className="flex items-end gap-3 px-5 py-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por nombre..."
              value={pagination.search ?? ''}
              onChange={(e) => pagination.onChangeSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>
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

      <PlatformRoleFormDrawer
        open={drawerOpen}
        role={selectedRole}
        permissions={permissions}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRole(null);
        }}
        onCreate={(data: PlatformRolePayload) => createRole(data)}
        onUpdate={(uid, data) => updateRole(uid, data)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteRole(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar rol?"
        description={
          <>
            Vas a eliminar el rol <strong>{deleteTarget?.name}</strong>. Esta acción no se puede
            deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
