'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo } from 'react';
import { formatRelative } from 'src/lib/date';
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
import { EditButton, MoreActionsMenu } from 'src/shared/components/ui/action-buttons';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Badge } from 'src/shared/components/ui/badge';
import { Icon } from 'src/shared/components/ui/icon';

import type { SettingsUser } from '../../types/settings.types';
import { UserStatusBadge } from './user-status-badge';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const columnHelper = createColumnHelper<SettingsUser>();

interface UsersTableProps {
  users: SettingsUser[];
  onEdit: (user: SettingsUser) => void;
  onToggleStatus: (user: SettingsUser) => void;
  onDelete: (user: SettingsUser) => void;
  /** Omitir si el admin actual no tiene el permiso users.manage */
  onResetTwoFactor?: (user: SettingsUser) => void;
  /** Server-side pagination (optional — falls back to client-side) */
  total?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function UsersTable({
  users,
  onEdit,
  onToggleStatus,
  onDelete,
  onResetTwoFactor,
  total,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: UsersTableProps) {
  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Usuario',
        cell: (info) => {
          const user = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs bg-violet-100 text-violet-700 font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground text-body2">{user.name}</p>
                <p className="text-caption text-muted-foreground">{user.email}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('role_name', {
        header: 'Rol',
        cell: (info) => (
          <Badge variant="outline" className="text-xs">
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('team_name', {
        header: 'Equipo',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => <UserStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('last_login_at', {
        header: 'Último acceso',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">
            {formatRelative(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => {
          const user = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <EditButton onClick={() => onEdit(user)} />
              <MoreActionsMenu
                items={[
                  {
                    label: 'Editar',
                    icon: <Icon name="Pencil" size={14} />,
                    onClick: () => onEdit(user),
                  },
                  {
                    label: user.status === 'ACTIVO' ? 'Desactivar' : 'Activar',
                    icon: (
                      <Icon name={user.status === 'ACTIVO' ? 'UserX' : 'UserCheck'} size={14} />
                    ),
                    onClick: () => onToggleStatus(user),
                  },
                  ...(onResetTwoFactor
                    ? [
                        {
                          label: 'Resetear 2FA',
                          icon: <Icon name="ShieldOff" size={14} />,
                          color: 'warning' as const,
                          onClick: () => onResetTwoFactor(user),
                        },
                      ]
                    : []),
                  {
                    label: 'Eliminar usuario',
                    icon: <Icon name="Trash2" size={14} />,
                    color: 'error',
                    onClick: () => onDelete(user),
                  },
                ]}
              />
            </div>
          );
        },
      }),
    ],
    [onEdit, onToggleStatus, onDelete, onResetTwoFactor]
  );

  const { table, dense, onChangeDense } = useTable({
    data: users,
    columns: COLUMNS,
    total,
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
    defaultRowsPerPage: 10,
  });

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon name="Users" size={40} className="mb-3 opacity-40" />
        <p className="text-body2">No se encontraron usuarios con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TableContainer>
        <Table>
          <TableHeadCustom table={table} />
          <TableBody dense={dense}>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="border-t border-border/40">
        <TablePaginationCustom
          table={table}
          dense={dense}
          onChangeDense={onChangeDense}
          total={total}
        />
      </div>
    </div>
  );
}
