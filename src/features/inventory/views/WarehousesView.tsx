'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { formatCompact, formatCompactNumber } from 'src/lib/currency';
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
import { Badge, Button, EditButton, Icon } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { GoodsReceiptDrawer } from '../components/GoodsReceiptDrawer';
import { InventoryPageSkeleton } from '../components/InventoryPageSkeleton';
import { TransferDrawer } from '../components/TransferDrawer';
import { WarehouseDrawer } from '../components/WarehouseDrawer';
import { WarehouseFilters } from '../components/WarehouseFilters';
import { useWarehouses } from '../hooks/use-warehouses';
import type { CreateWarehousePayload, Warehouse } from '../types/inventory.types';

interface WarehouseRow {
  warehouse: Warehouse;
}

const columnHelper = createColumnHelper<WarehouseRow>();

export function WarehousesView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [filterStock, setFilterStock] = useState('all');

  const {
    items: warehouses,
    summary: warehousesSummary,
    isLoading,
    createWarehouse,
    updateWarehouse,
    refetch,
    pagination,
  } = useWarehouses({
    search: debouncedSearch || undefined,
    has_stock: filterStock === 'with_stock' ? true : undefined,
  });
  const [warehouseDrawerOpen, setWarehouseDrawerOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const maxPhysical = Math.max(...warehouses.map((w) => w.summary?.total_physical ?? 0), 1);

  const totalPhysical = warehouses.reduce((sum, w) => sum + (w.summary?.total_physical ?? 0), 0);
  const totalAvailable = warehouses.reduce((sum, w) => sum + (w.summary?.total_available ?? 0), 0);
  const totalValue = warehouses.reduce((sum, w) => sum + (w.summary?.total_value ?? 0), 0);

  const statsCards = warehousesSummary
    ? [
        {
          title: 'Bodegas activas',
          value: warehousesSummary.active_warehouses,
          badge: 'habilitadas',
          icon: <Icon name="Warehouse" size={18} />,
          iconClassName: 'bg-primary/10 text-primary',
        },
        {
          title: 'Stock físico total',
          value: formatCompactNumber(totalPhysical),
          badge: 'unidades en sistema',
          icon: <Icon name="Package" size={18} />,
          iconClassName: 'bg-info/10 text-info',
        },
        {
          title: 'Disponible total',
          value: formatCompactNumber(totalAvailable),
          badge: 'para despacho',
          icon: <Icon name="CheckCircle" size={18} />,
          iconClassName: 'bg-success/10 text-success',
        },
        {
          title: 'Valor en stock',
          value: totalValue > 0 ? formatCompact(totalValue) : '—',
          badge: 'costo de inventario',
          icon: <Icon name="DollarSign" size={18} />,
          iconClassName: 'bg-warning/10 text-warning',
        },
      ]
    : [];

  const warehouseRows: WarehouseRow[] = useMemo(
    () => warehouses.map((w) => ({ warehouse: w })),
    [warehouses]
  );

  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('warehouse', {
        header: 'Bodega',
        cell: (info) => {
          const w = info.getValue();
          return (
            <div>
              <p className="text-subtitle2 text-foreground">{w.name}</p>
              <p className="text-caption text-muted-foreground font-mono">{w.code}</p>
            </div>
          );
        },
      }),
      columnHelper.accessor('warehouse', {
        id: 'location',
        header: 'Ubicación',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">
            {info.getValue().location ?? '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'sku_count',
        header: () => <div className="text-right w-full">SKUs</div>,
        cell: (info) => (
          <div className="text-right text-muted-foreground">
            {info.row.original.warehouse.summary?.sku_count ?? '—'}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'total_physical',
        header: () => <div className="text-right w-full">Stock Físico</div>,
        cell: (info) => (
          <div className="text-right font-semibold text-foreground">
            {info.row.original.warehouse.summary?.total_physical ?? '—'}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'total_available',
        header: () => <div className="text-right w-full font-semibold">Disponible</div>,
        cell: (info) => {
          const val = info.row.original.warehouse.summary?.total_available;
          return (
            <div
              className={cn(
                'text-right font-bold',
                val != null && val <= 0 ? 'text-error' : 'text-success'
              )}
            >
              {val ?? '—'}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'total_value',
        header: () => <div className="text-right w-full">Valor</div>,
        cell: (info) => {
          const val = info.row.original.warehouse.summary?.total_value;
          return (
            <div className="text-right text-muted-foreground text-sm">
              {val != null && val > 0 ? `$${val.toLocaleString('es-AR')}` : '—'}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'fill',
        header: 'Ocupación',
        cell: (info) => {
          const physical = info.row.original.warehouse.summary?.total_physical ?? 0;
          const pct = Math.round((physical / maxPhysical) * 100);
          return (
            <div className="w-28">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% del mayor</p>
            </div>
          );
        },
      }),
      columnHelper.accessor('warehouse', {
        id: 'status',
        header: 'Estado',
        cell: (info) => {
          const active = info.getValue().is_active;
          return (
            <Badge variant="soft" color={active ? 'success' : 'inherit'}>
              {active ? 'Activa' : 'Inactiva'}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <EditButton
            onClick={() => {
              setSelectedWarehouse(info.row.original.warehouse);
              setWarehouseDrawerOpen(true);
            }}
          />
        ),
      }),
    ],
    [maxPhysical]
  );

  const { table, dense, onChangeDense } = useTable({
    data: warehouseRows,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const handleWarehouseSave = async (payload: CreateWarehousePayload) => {
    if (selectedWarehouse) {
      await updateWarehouse(selectedWarehouse.uid, payload);
    } else {
      await createWarehouse(payload);
    }
  };

  if (isLoading)
    return (
      <InventoryPageSkeleton
        title="Vista General de Bodegas"
        subtitle="Estado actual del stock por bodega"
      />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Vista General de Bodegas"
        subtitle="Estado actual del stock por bodega"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedWarehouse(null);
                setWarehouseDrawerOpen(true);
              }}
            >
              <Icon name="Plus" size={15} />
              Nueva bodega
            </Button>
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
            icon={card.icon}
            iconClassName={card.iconClassName}
            trend={card.badge}
            trendUp
          />
        ))}
      </div>

      <SectionCard noPadding>
        <WarehouseFilters
          search={search}
          onSearch={setSearch}
          filterStock={filterStock}
          onFilterStock={setFilterStock}
        />
        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-5">
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
            total={pagination.total}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </div>
      </SectionCard>

      <WarehouseDrawer
        open={warehouseDrawerOpen}
        warehouse={selectedWarehouse}
        onClose={() => setWarehouseDrawerOpen(false)}
        onSave={handleWarehouseSave}
      />
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
