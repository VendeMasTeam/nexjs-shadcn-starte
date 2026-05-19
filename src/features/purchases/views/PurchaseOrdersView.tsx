'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { formatMoney } from 'src/lib/currency';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
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
import { Badge, Button, ConfirmDialog, Icon, Input, SelectField } from 'src/shared/components/ui';

import { usePurchaseOrders } from '../hooks/use-purchase-orders';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types/purchase-order.types';

const STATUS_MAP: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprobada', color: 'bg-blue-50 text-blue-700' },
  ordered: { label: 'Ordenada', color: 'bg-indigo-50 text-indigo-700' },
  partially_received: { label: 'Parcial', color: 'bg-orange-50 text-orange-700' },
  partial_received: { label: 'Parcialmente Recibido', color: 'bg-blue-50 text-blue-700' },
  received: { label: 'Recibida', color: 'bg-emerald-50 text-emerald-700' },
  closed: { label: 'Cerrada', color: 'bg-gray-200 text-gray-500' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-500' },
  partial_paid: { label: 'Pago parcial', color: 'bg-cyan-50 text-cyan-700' },
  paid: { label: 'Pagado', color: 'bg-green-50 text-green-700' },
  overdue: { label: 'Vencido', color: 'bg-red-50 text-red-500' },
};

// Backend-compatible status filter values.
// The backend PurchaseOrderService::index() validates against these statuses.
const BACKEND_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'partial_received', label: 'Parcial' },
  { value: 'received', label: 'Recibida' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'partial_paid', label: 'Pago parcial' },
  { value: 'paid', label: 'Pagada' },
  { value: 'overdue', label: 'Vencida' },
];

const columnHelper = createColumnHelper<PurchaseOrder>();

export function PurchaseOrdersView() {
  const [filterStatus, setFilterStatus] = useState('all');

  const { orders, approveOrder, receiveOrder, pagination, search, onChangeSearch } =
    usePurchaseOrders({
      status: filterStatus !== 'all' ? filterStatus : undefined,
    });

  const [approveDialog, setApproveDialog] = useState<{ open: boolean; uid: string }>({
    open: false,
    uid: '',
  });
  const [receiveDialog, setReceiveDialog] = useState<{ open: boolean; uid: string }>({
    open: false,
    uid: '',
  });

  const COLUMNS = [
    columnHelper.accessor('purchase_number', {
      header: 'N° OC',
      cell: (i) => <span className="font-semibold">{i.getValue()}</span>,
    }),
    columnHelper.accessor('supplier', {
      header: 'Proveedor',
      cell: (i) => <span className="text-sm">{i.getValue()?.name || '—'}</span>,
    }),
    columnHelper.accessor('total', {
      header: 'Total',
      cell: (i) => <span className="font-semibold">{formatMoney(i.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (i) => {
        const { label, color } = STATUS_MAP[i.getValue()];
        return (
          <Badge
            variant="soft"
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-none ${color}`}
          >
            {label}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('ordered_at', {
      header: 'Fecha',
      cell: (i) => (
        <span className="text-sm text-muted-foreground">
          {i.getValue() ? format(new Date(i.getValue()!), 'dd MMM yyyy', { locale: es }) : '—'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'acciones',
      header: () => <div className="text-right w-full">Acciones</div>,
      cell: (i) => {
        const o = i.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {o.status === 'pending_approval' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApproveDialog({ open: true, uid: o.uid })}
                className="text-xs text-success"
              >
                Aprobar
              </Button>
            )}
            {o.status === 'approved' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReceiveDialog({ open: true, uid: o.uid })}
                className="text-xs text-primary"
              >
                Recibir
              </Button>
            )}
          </div>
        );
      },
    }),
  ];
  const { table, dense, onChangeDense } = useTable({
    data: orders,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  return (
    <PageContainer>
      <PageHeader title="Órdenes de Compra" subtitle="Gestión de compras a proveedores" />
      <SectionCard noPadding>
        {/* Filters bar */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por número de OC..."
              value={search}
              onChange={(e) => onChangeSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>
          <SelectField
            label="Estado"
            options={[{ value: 'all', label: 'Todos los estados' }, ...BACKEND_STATUS_FILTERS]}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string)}
          />
        </div>

        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.map((r) => (
                <TableRow key={r.id}>
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id} className="px-5">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
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
            total={pagination.total}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </div>
      </SectionCard>

      <ConfirmDialog
        open={approveDialog.open}
        onClose={() => setApproveDialog({ open: false, uid: '' })}
        onConfirm={async () => {
          await approveOrder.mutateAsync(approveDialog.uid);
          setApproveDialog({ open: false, uid: '' });
        }}
        title="Aprobar orden de compra"
        description="¿Estás seguro de aprobar esta orden de compra?"
        confirmLabel="Aprobar"
        variant="default"
      />

      <ConfirmDialog
        open={receiveDialog.open}
        onClose={() => setReceiveDialog({ open: false, uid: '' })}
        onConfirm={async () => {
          await receiveOrder.mutateAsync(receiveDialog.uid);
          setReceiveDialog({ open: false, uid: '' });
        }}
        title="Marcar como recibido"
        description="¿Confirmas que la orden fue recibida completamente?"
        confirmLabel="Marcar como recibido"
        variant="default"
      />
    </PageContainer>
  );
}
