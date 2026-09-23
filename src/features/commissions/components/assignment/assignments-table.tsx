'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
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
import { EditButton } from 'src/shared/components/ui/action-buttons';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';

import type { CommissionAssignment } from '../../types/commissions.types';

interface AssignmentsTableProps {
  asignaciones: CommissionAssignment[];
  isLoading: boolean;
  onEdit: (asignacion: CommissionAssignment) => void;
  onToggleStatus: (id: string, newActive: boolean) => void;
  total?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const columnHelper = createColumnHelper<CommissionAssignment>();

export const AssignmentsTable: React.FC<AssignmentsTableProps> = ({
  asignaciones,
  isLoading,
  onEdit,
  onToggleStatus,
  total,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('user_name', {
        header: 'Vendedor',
        cell: (info) => {
          const name = info.getValue() || '';
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-600 font-bold">
                  {name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('plan_name', {
        header: 'Plan Asignado',
        cell: (info) => (
          <span
            className={
              info.getValue() ? 'font-medium text-foreground' : 'text-muted-foreground italic'
            }
          >
            {info.getValue() || '— Sin plan asignado'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'vigencia',
        header: 'Vigencia',
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="text-muted-foreground">
              {row.start_date ? format(new Date(row.start_date), 'dd/MM/yyyy') : '—'}
              {row.end_date ? ` - ${format(new Date(row.end_date), 'dd/MM/yyyy')}` : ''}
            </span>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const val = info.getValue();
          return (
            <Badge
              variant="outline"
              className={
                val === 'active'
                  ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200'
              }
            >
              {val === 'active' ? 'Activo' : 'Inactivo'}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => {
          const asg = info.row.original;
          return (
            <div
              className="flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <EditButton onClick={() => onEdit(asg)} />
              <Button
                variant="outline"
                size="sm"
                className={
                  asg.status === 'active'
                    ? 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                    : 'text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300'
                }
                onClick={() => onToggleStatus(asg.uid, asg.status !== 'active')}
              >
                <Icon name={asg.status === 'active' ? 'UserX' : 'UserCheck'} size={14} />
                {asg.status === 'active' ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          );
        },
      }),
    ],
    [onEdit, onToggleStatus]
  );

  const { table, dense, onChangeDense } = useTable({
    data: asignaciones,
    columns: COLUMNS,
    defaultRowsPerPage: 10,
    total,
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-10 px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (!asignaciones.length) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <h3 className="text-lg font-medium text-muted-foreground">No hay vendedores asignados</h3>
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
                  <TableCell key={cell.id} className={!dense ? 'py-4' : undefined}>
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
};
