'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMoney } from 'src/lib/currency';
import { paths } from 'src/routes/paths';
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
import { useQuotationStatusOptions } from 'src/shared/hooks/use-status-options';
import { useDebounce } from 'use-debounce';

import { SalesPageSkeleton } from '../components/SalesPageSkeleton';
import { useSalesContext } from '../context/SalesContext';
import type { Quotation } from '../types/sales.types';
import { STATUS_LABELS } from '../types/sales.types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-amber-500/10 text-amber-600' },
  sent: { label: 'Enviada', className: 'bg-blue-500/10 text-blue-600' },
  approved: { label: 'Aprobada', className: 'bg-emerald-500/10 text-emerald-600' },
  rejected: { label: 'Rechazada', className: 'bg-red-500/10 text-red-600' },
  cancelled: { label: 'Cancelada', className: 'bg-purple-500/10 text-purple-600' },
};

// ─── Column helper ────────────────────────────────────────────────────────────

const col = createColumnHelper<Quotation>();

// ─── View ─────────────────────────────────────────────────────────────────────

export function QuotationsListView() {
  const router = useRouter();
  const {
    quotations,
    convertQuotationToInvoice,
    isLoading,
    quotationSearch,
    onChangeQuotationSearch,
    quotationStatus,
    onChangeQuotationStatus,
    quotationsPagination,
  } = useSalesContext();

  const { data: quotationStatuses = [] } = useQuotationStatusOptions();

  const [search, setSearch] = useState(quotationSearch);
  const [debouncedSearch] = useDebounce(search, 400);
  if (debouncedSearch !== quotationSearch) onChangeQuotationSearch(debouncedSearch);

  const columns = useMemo(
    () => [
      col.accessor('quote_number', {
        header: 'Número',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
        ),
      }),
      col.accessor('title', {
        header: 'Cliente / Título',
        cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
      }),
      col.accessor('quoteable_uid', {
        header: 'Ref. Oportunidad',
        cell: (info) => (
          <span className="text-muted-foreground font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      col.accessor('currency', {
        header: 'Moneda',
        cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
      }),
      col.accessor('created_at', {
        header: 'Fecha',
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      col.accessor('total', {
        header: 'Total',
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {formatMoney(info.getValue(), {
              scope: 'tenant',
              maximumFractionDigits: 0,
            })}
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const config = STATUS_CONFIG[info.getValue()] ?? {
            label: STATUS_LABELS[info.getValue()] ?? info.getValue(),
            className: 'bg-muted text-muted-foreground',
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
        cell: ({ row }) => {
          const q = row.original;
          const canConvert = q.status === 'sent' || q.status === 'approved';
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(paths.sales.quotation(q.uid));
                }}
                title="Ver detalle"
              >
                <Icon name="Eye" size={15} />
              </Button>
              {canConvert && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const invoice = await convertQuotationToInvoice(q.uid);
                    if (invoice) {
                      router.push(paths.sales.invoice(invoice.uid));
                    }
                  }}
                  title="Convertir a factura"
                >
                  <Icon name="CheckCircle2" size={15} />
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [router, convertQuotationToInvoice]
  );

  const { table, dense, onChangeDense } = useTable({
    data: quotations,
    columns,
    total: quotationsPagination.total,
    pageIndex: quotationsPagination.page - 1,
    pageSize: quotationsPagination.rowsPerPage,
    onPageChange: (pi: number) => quotationsPagination.onChangePage(pi + 1),
    onPageSizeChange: quotationsPagination.onChangeRowsPerPage,
  });

  if (isLoading)
    return (
      <SalesPageSkeleton title="Cotizaciones" subtitle="Cargando historial de cotizaciones..." />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Cotizaciones"
        subtitle={`${quotationsPagination.total} cotización${quotationsPagination.total !== 1 ? 'es' : ''}`}
        action={
          <Button color="primary" onClick={() => router.push(paths.sales.pipeline)}>
            <Icon name="Plus" size={16} />
            Nueva Cotización
          </Button>
        }
      />

      {/* Filtros — server-side via backend GET /quotations?search=&status= */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          label="Buscar"
          placeholder="Buscar por número, título o referencia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Icon name="Search" size={15} />}
          className="sm:max-w-xs"
        />
        <SelectField
          label="Estado"
          value={quotationStatus}
          onChange={(v) => onChangeQuotationStatus(v as string)}
          options={[{ value: '', label: 'Todos los estados' }, ...quotationStatuses]}
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
                        {search || quotationStatus
                          ? 'Sin resultados para los filtros aplicados'
                          : 'Aún no hay cotizaciones'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(paths.sales.quotation(row.original.uid))}
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
            total={quotationsPagination.total}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </div>
      </SectionCard>
    </PageContainer>
  );
}
