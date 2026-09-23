'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { endpoints } from 'src/lib/axios';
import { formatMoney } from 'src/lib/currency';
import { formatDate } from 'src/lib/date';
import { downloadExport } from 'src/lib/export-service';
import { paths } from 'src/routes/paths';
import { ExportDropdown } from 'src/shared/components/export/ExportDropdown';
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
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useInvoiceStatusOptions } from 'src/shared/hooks/use-status-options';
import { useDebounce } from 'use-debounce';

import { SalesPageSkeleton } from '../components/SalesPageSkeleton';
import { useSalesContext } from '../context/SalesContext';
import type { Invoice } from '../types/sales.types';
import { STATUS_LABELS } from '../types/sales.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLocal(dateStr: string): string {
  try {
    return formatDate(dateStr + 'T12:00:00', { month: 'short' });
  } catch {
    return dateStr;
  }
}

function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid') return false;
  return new Date(invoice.due_date) < new Date();
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  issued: { label: 'Emitida', className: 'bg-amber-500/10 text-amber-600' },
  partial: { label: 'Pago Parcial', className: 'bg-blue-500/10 text-blue-600' },
  paid: { label: 'Pagada', className: 'bg-emerald-500/10 text-emerald-600' },
  overdue: { label: 'Vencida', className: 'bg-red-500/10 text-red-600' },
  draft: { label: 'Borrador', className: 'bg-muted/10 text-muted-foreground' },
};

function getEffectiveStatus(invoice: Invoice): string {
  if (invoice.status === 'paid') return 'paid';
  if (invoice.status === 'overdue' || isOverdue(invoice)) return 'overdue';
  return invoice.status;
}

// ─── Column helper ────────────────────────────────────────────────────────────

const col = createColumnHelper<Invoice>();

// ─── View ─────────────────────────────────────────────────────────────────────

export function InvoicesListView() {
  const router = useRouter();
  const {
    invoices,
    isLoading,
    invoiceSearch,
    onChangeInvoiceSearch,
    invoiceStatus,
    onChangeInvoiceStatus,
    invoicesPagination,
  } = useSalesContext();

  const { data: invoiceStatuses = [] } = useInvoiceStatusOptions();

  const [search, setSearch] = useState(invoiceSearch);
  const [debouncedSearch] = useDebounce(search, 400);
  if (debouncedSearch !== invoiceSearch) onChangeInvoiceSearch(debouncedSearch);

  const overdueCount = useMemo(() => invoices.filter(isOverdue).length, [invoices]);
  const pendingBalance = useMemo(
    () => invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.outstanding_total, 0),
    [invoices]
  );

  const columns = useMemo(
    () => [
      col.accessor('invoice_number', {
        header: 'Número',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      col.accessor('quotation_uid', {
        header: 'Cotización',
        cell: (info) => (
          <span className="font-medium text-foreground font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      col.accessor('issued_at', {
        header: 'Emisión',
        cell: (info) => (
          <span className="text-muted-foreground">{formatDateLocal(info.getValue())}</span>
        ),
      }),
      col.accessor('due_date', {
        header: 'Vencimiento',
        cell: ({ row }) => {
          const overdue = isOverdue(row.original);
          return (
            <span className={overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
              {formatDateLocal(row.original.due_date)}
              {overdue && <Icon name="AlertTriangle" size={12} className="inline ml-1" />}
            </span>
          );
        },
      }),
      col.accessor('total', {
        header: 'Total',
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {formatMoney(info.getValue(), { scope: 'tenant', maximumFractionDigits: 0 })}
          </span>
        ),
      }),
      col.accessor('paid_total', {
        header: 'Pagado',
        cell: (info) => (
          <span className="text-emerald-600 font-medium">
            {formatMoney(info.getValue(), { scope: 'tenant', maximumFractionDigits: 0 })}
          </span>
        ),
      }),
      col.accessor('outstanding_total', {
        header: 'Saldo',
        cell: (info) => {
          const balance = info.getValue();
          return (
            <span
              className={balance > 0 ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}
            >
              {formatMoney(balance, { scope: 'tenant', maximumFractionDigits: 0 })}
            </span>
          );
        },
      }),
      col.display({
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const effStatus = getEffectiveStatus(row.original);
          const config = STATUS_CONFIG[effStatus] ?? {
            label: STATUS_LABELS[effStatus] ?? effStatus,
            className: 'bg-muted/10 text-muted-foreground',
          };
          return (
            <Badge
              variant="soft"
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border-none ${config.className}`}
            >
              {config.label}
            </Badge>
          );
        },
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              router.push(paths.sales.invoice(row.original.uid));
            }}
            title="Ver detalle"
          >
            <Icon name="Eye" size={15} />
          </Button>
        ),
      }),
    ],
    [router]
  );

  const { table, dense, onChangeDense } = useTable({
    data: invoices,
    columns,
    total: invoicesPagination.total,
    pageIndex: invoicesPagination.page - 1,
    pageSize: invoicesPagination.rowsPerPage,
    onPageChange: (pi: number) => invoicesPagination.onChangePage(pi + 1),
    onPageSizeChange: invoicesPagination.onChangeRowsPerPage,
  });

  const handleExport = async (format: 'excel' | 'pdf') => {
    await downloadExport({
      endpoint: endpoints.invoicesExport,
      format,
      filters: { status: invoiceStatus || undefined, search: invoiceSearch || undefined },
      filename: `facturas.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    });
  };

  if (isLoading)
    return <SalesPageSkeleton title="Facturas" subtitle="Cargando historial de facturas..." />;

  return (
    <PageContainer>
      <PageHeader
        title="Facturas"
        subtitle={`${invoicesPagination.total} factura${invoicesPagination.total !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <Button color="primary" onClick={() => router.push(paths.sales.pipeline)}>
              <Icon name="Plus" size={16} />
              Nueva Factura
            </Button>
          </div>
        }
      />

      {/* Alerta de mora */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-4 mb-5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
          <Icon name="AlertTriangle" size={18} className="text-red-500 shrink-0" />
          <span className="font-medium text-red-700 dark:text-red-400">
            {overdueCount} factura{overdueCount !== 1 ? 's' : ''} vencida
            {overdueCount !== 1 ? 's' : ''} — saldo en mora:{' '}
            <strong>
              {formatMoney(pendingBalance, { scope: 'tenant', maximumFractionDigits: 0 })}
            </strong>
          </span>
        </div>
      )}

      {/* Filtros — server-side via backend GET /finance/invoices?search=&status= */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          label="Buscar"
          placeholder="Buscar por número, cotización o referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Icon name="Search" size={15} />}
          className="sm:max-w-xs"
        />
        <SelectField
          label="Estado"
          value={invoiceStatus}
          onChange={(v) => onChangeInvoiceStatus(v as string)}
          options={[{ value: '', label: 'Todos los estados' }, ...invoiceStatuses]}
          className="sm:w-52"
        />
      </div>

      {/* Tabla */}
      <SectionCard noPadding>
        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Icon name="FileText" size={32} className="opacity-30" />
                      <span className="text-sm">
                        {invoiceSearch || invoiceStatus
                          ? 'Sin resultados para los filtros aplicados'
                          : 'Aún no hay facturas'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(paths.sales.invoice(row.original.uid))}
                  >
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
            total={invoicesPagination.total}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}
