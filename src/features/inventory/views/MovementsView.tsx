'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { Fragment, useMemo, useState } from 'react';
import { formatCompactNumber } from 'src/lib/currency';
import { cn } from 'src/lib/utils';
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
import { Badge, Button, Icon } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { GoodsReceiptDrawer } from '../components/GoodsReceiptDrawer';
import { InventoryPageSkeleton } from '../components/InventoryPageSkeleton';
import { MovementFilters } from '../components/MovementFilters';
import { TransferDrawer } from '../components/TransferDrawer';
import { useMovements } from '../hooks/use-movements';
import type { InventoryMovement, MovementType } from '../types/inventory.types';

const MOVEMENT_TYPE_CONFIG: Record<
  MovementType,
  { label: string; color: 'primary' | 'success' | 'warning' | 'info' | 'error' | 'secondary' }
> = {
  transfer: { label: 'Traslado', color: 'info' },
  adjustment_in: { label: 'Ajuste entrada', color: 'success' },
  adjustment_out: { label: 'Ajuste salida', color: 'warning' },
  set_balance: { label: 'Balanceo', color: 'secondary' },
  reservation: { label: 'Reserva', color: 'primary' },
  reservation_release: { label: 'Liberación', color: 'secondary' },
  reservation_consume: { label: 'Consumo', color: 'error' },
};

const columnHelper = createColumnHelper<InventoryMovement>();

function MovementExpandedRow({ movement }: { movement: InventoryMovement }) {
  return (
    <div className="flex flex-col gap-1 text-caption text-muted-foreground">
      {movement.from_warehouse && (
        <p>
          Desde: <span className="text-foreground font-medium">{movement.from_warehouse.name}</span>
        </p>
      )}
      {movement.to_warehouse && (
        <p>
          Hacia: <span className="text-foreground font-medium">{movement.to_warehouse.name}</span>
        </p>
      )}
      {movement.comment && (
        <p>
          Notas: <span className="text-foreground">{movement.comment}</span>
        </p>
      )}
      {movement.reference_uid && (
        <p>
          Referencia: <span className="text-primary font-medium">{movement.reference_uid}</span>
        </p>
      )}
    </div>
  );
}

export function MovementsView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [filterType, setFilterType] = useState('all');
  const [transferOpen, setTransferOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { items, summary, isLoading, refetch, pagination } = useMovements({
    type: filterType !== 'all' ? filterType : undefined,
    search: debouncedSearch || undefined,
  });

  const toggleRow = (uid: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const statsCards = summary
    ? [
        {
          title: 'Movimientos este mes',
          value: formatCompactNumber(summary.total),
          trend: 'este período',
          trendUp: true,
          icon: <Icon name="ArrowLeftRight" size={18} />,
          iconClassName: 'bg-primary/10 text-primary',
        },
        {
          title: 'Entradas',
          value: formatCompactNumber(summary.entries),
          trend: 'este período',
          trendUp: true,
          icon: <Icon name="PackagePlus" size={18} />,
          iconClassName: 'bg-success/10 text-success',
        },
        {
          title: 'Traslados',
          value: formatCompactNumber(summary.transfers),
          trend: 'este mes',
          trendUp: true,
          icon: <Icon name="ArrowLeftRight" size={18} />,
          iconClassName: 'bg-info/10 text-info',
        },
        {
          title: 'Ajustes manuales',
          value: formatCompactNumber(summary.adjustments),
          trend: 'este mes',
          trendUp: false,
          icon: <Icon name="SlidersHorizontal" size={18} />,
          iconClassName: 'bg-warning/10 text-warning',
        },
      ]
    : [];

  const COLUMNS = useMemo(
    () => [
      columnHelper.display({
        id: 'expand',
        header: '',
        cell: (info) => {
          const m = info.row.original;
          const canExpand = !!(m.comment || m.from_warehouse || m.to_warehouse || m.reference_uid);
          if (!canExpand) return null;
          const isOpen = expandedRows.has(m.uid);
          return (
            <button
              onClick={() => toggleRow(m.uid)}
              className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={15} />
            </button>
          );
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Fecha y hora',
        cell: (info) => (
          <span className="text-caption text-muted-foreground whitespace-nowrap">
            {new Date(info.getValue()).toLocaleString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Tipo',
        cell: (info) => {
          const config = MOVEMENT_TYPE_CONFIG[info.getValue()];
          return (
            <Badge variant="soft" color={config.color}>
              {config.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'product',
        header: 'Producto',
        cell: (info) => {
          const m = info.row.original;
          return m.product ? (
            <div>
              <p className="text-subtitle2 text-foreground">{m.product.name}</p>
              <p className="text-caption text-muted-foreground font-mono">{m.product.sku}</p>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      }),
      columnHelper.display({
        id: 'route',
        header: 'Ruta',
        cell: (info) => {
          const m = info.row.original;
          if (m.type === 'transfer' && m.from_warehouse && m.to_warehouse) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="soft" color="secondary">
                  {m.from_warehouse.name}
                </Badge>
                <Icon name="ArrowRight" size={12} className="text-muted-foreground" />
                <Badge variant="soft" color="info">
                  {m.to_warehouse.name}
                </Badge>
              </div>
            );
          }
          if (m.to_warehouse) {
            return (
              <div className="flex items-center gap-1.5">
                <Badge variant="soft" color="secondary">
                  Externo
                </Badge>
                <Icon name="ArrowRight" size={12} className="text-muted-foreground" />
                <Badge variant="soft" color="success">
                  {m.to_warehouse.name}
                </Badge>
              </div>
            );
          }
          if (m.from_warehouse) {
            return (
              <Badge variant="soft" color="warning">
                {m.from_warehouse.name}
              </Badge>
            );
          }
          return null;
        },
      }),
      columnHelper.accessor('quantity', {
        header: () => <div className="text-right w-full">Cantidad</div>,
        cell: (info) => {
          const m = info.row.original;
          const isNegative = m.type === 'adjustment_out';
          return (
            <div
              className={cn(
                'text-right font-semibold',
                isNegative ? 'text-warning' : 'text-foreground'
              )}
            >
              {isNegative ? '-' : m.type === 'adjustment_in' ? '+' : ''}
              {info.getValue()}
            </div>
          );
        },
      }),
      columnHelper.accessor('performed_by', {
        header: 'Registrado por',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{info.getValue()?.name ?? '—'}</span>
        ),
      }),
    ],
    [expandedRows]
  );

  const { table, dense, onChangeDense } = useTable({
    data: items,
    columns: COLUMNS,
    defaultRowsPerPage: 20,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  if (isLoading)
    return (
      <InventoryPageSkeleton
        title="Movimientos"
        subtitle="Historial completo de traslados, entradas y ajustes"
      />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Movimientos"
        subtitle="Historial completo de traslados, entradas y ajustes"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <Icon name="ArrowLeftRight" size={15} />
              Traslado
            </Button>
            <Button color="primary" size="sm" onClick={() => setReceiptOpen(true)}>
              <Icon name="PackagePlus" size={15} />
              Entrada
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            trend={card.trend}
            trendUp={card.trendUp}
            icon={card.icon}
            iconClassName={card.iconClassName}
          />
        ))}
      </div>

      <SectionCard noPadding>
        <MovementFilters
          search={search}
          onSearch={setSearch}
          filterType={filterType}
          onFilterType={setFilterType}
        />
        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.uid) && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length} className="px-8 py-3">
                        <MovementExpandedRow movement={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
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

      <TransferDrawer
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={refetch}
      />
      <GoodsReceiptDrawer
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onSuccess={refetch}
      />
    </PageContainer>
  );
}
