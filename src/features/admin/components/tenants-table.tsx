'use client';

import { flexRender } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Tenant } from 'src/features/admin/types/admin.types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeadCustom,
  TablePaginationCustom,
  TableRow,
  TableSkeleton,
  useTable,
} from 'src/shared/components/table';
import { Icon } from 'src/shared/components/ui/icon';

import { buildTenantColumns } from './tenant-columns';

interface TenantsTableProps {
  tenants: Tenant[];
  isLoading?: boolean;
  onEdit: (tenant: Tenant) => void;
  onViewDetail: (tenant: Tenant) => void;
  onSupportLogin: (tenant: Tenant) => void;
  canSupport: boolean;
  /** Server-side pagination (optional — falls back to client-side) */
  total?: number;
  pageIndex?: number;
  pageSize?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TenantsTable({
  tenants,
  isLoading,
  onEdit,
  onViewDetail,
  onSupportLogin,
  canSupport,
  total,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TenantsTableProps) {
  const COLUMNS = useMemo(
    () => buildTenantColumns({ onEdit, onViewDetail, onSupportLogin, canSupport }),
    [onEdit, onViewDetail, onSupportLogin, canSupport]
  );

  const { table, dense, onChangeDense } = useTable({
    data: isLoading ? [] : tenants,
    columns: COLUMNS,
    total,
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
    defaultRowsPerPage: 10,
  });

  if (!isLoading && tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon name="UserCheck" className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-body2">No se encontraron clientes con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TableContainer>
        <Table>
          <TableHeadCustom table={table} />
          <TableBody dense={dense}>
            {isLoading ? (
              <TableSkeleton rows={10} columns={8} />
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
