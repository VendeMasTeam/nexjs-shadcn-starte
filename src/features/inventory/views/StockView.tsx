'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { Fragment, useMemo, useState } from 'react';
import { endpoints } from 'src/lib/axios';
import { formatCompactNumber } from 'src/lib/currency';
import { downloadExport } from 'src/lib/export-service';
import { cn } from 'src/lib/utils';
import { ExportDropdown } from 'src/shared/components/export/ExportDropdown';
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
import { Button, Icon } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { InventoryPageSkeleton } from '../components/InventoryPageSkeleton';
import { StockAdjustmentDrawer } from '../components/StockAdjustmentDrawer';
import { StockBadge } from '../components/StockBadge';
import { StockFilters } from '../components/StockFilters';
import { useCategories } from '../hooks/use-categories';
import { useProducts } from '../hooks/use-products';
import { useWarehouses } from '../hooks/use-warehouses';
import type { InventoryMasterItem, WarehouseStockEntry } from '../types/inventory.types';

const columnHelper = createColumnHelper<InventoryMasterItem>();

function WarehouseBreakdownRow({ stocks }: { stocks: WarehouseStockEntry[] }) {
  if (stocks.length === 0) {
    return <p className="text-body2 text-muted-foreground py-2">Sin stock en ninguna bodega.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-caption text-muted-foreground font-medium uppercase tracking-wide mb-2">
        Stock por bodega
      </p>
      {stocks.map((s) => (
        <div
          key={s.warehouse_uid}
          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30"
        >
          <div className="flex items-center gap-2">
            <Icon name="Warehouse" size={14} className="text-muted-foreground" />
            <p className="text-subtitle2 text-foreground">{s.warehouse.name}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Físico: <span className="font-semibold text-foreground">{s.physical_stock}</span>
            </span>
            <span className="text-muted-foreground">
              Reservado: <span className="font-semibold text-foreground">{s.reserved_stock}</span>
            </span>
            <span
              className={cn('font-bold', s.available_stock <= 0 ? 'text-error' : 'text-success')}
            >
              Disponible: {s.available_stock}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StockView() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const [debouncedSearch] = useDebounce(search, 400);
  const [debouncedCategorySearch] = useDebounce(categorySearch, 400);
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch, 400);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<InventoryMasterItem | null>(null);

  const stock_state = ['normal', 'low', 'out'].includes(filterStatus)
    ? (filterStatus as 'normal' | 'low' | 'out')
    : undefined;

  const { items, summary, isLoading, refetch, pagination } = useProducts({
    search: debouncedSearch || undefined,
    category_uid: filterCategory !== 'all' ? filterCategory : undefined,
    warehouse_uid: filterWarehouse !== 'all' ? filterWarehouse : undefined,
    stock_state,
  });

  const { categories } = useCategories({
    search: debouncedCategorySearch || undefined,
    per_page: 15,
  });
  const { items: warehouses } = useWarehouses({ search: debouncedWarehouseSearch || undefined });

  const toggleRow = (uid: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    await downloadExport({
      endpoint: endpoints.stockExport,
      format,
      filters: {
        search,
        category_uid: filterCategory !== 'all' ? filterCategory : undefined,
        warehouse_uid: filterWarehouse !== 'all' ? filterWarehouse : undefined,
        stock_status: filterStatus !== 'all' ? filterStatus : undefined,
      },
      filename: `stock.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    });
  };

  const statsCards = summary
    ? [
        {
          title: 'Disponible para venta',
          value: formatCompactNumber(summary.total_available_stock ?? 0),
          badge: `${summary.total_physical_stock > 0 ? Math.round((summary.total_available_stock / summary.total_physical_stock) * 100) : 0}% del físico`,
          icon: <Icon name="CheckCircle" size={18} />,
          iconClassName: 'bg-success/10 text-success',
        },
        {
          title: 'Reservado',
          value: formatCompactNumber(summary.total_reserved_stock ?? 0),
          badge: `${summary.total_physical_stock > 0 ? Math.round((summary.total_reserved_stock / summary.total_physical_stock) * 100) : 0}% del físico`,
          icon: <Icon name="CalendarDays" size={18} />,
          iconClassName: 'bg-info/10 text-info',
        },
        {
          title: 'Stock físico total',
          value: formatCompactNumber(summary.total_physical_stock ?? 0),
          badge: 'unidades en sistema',
          icon: <Icon name="Package" size={18} />,
          iconClassName: 'bg-primary/10 text-primary',
        },
        {
          title: 'Productos críticos',
          value: summary.out_of_stock_count,
          badge: 'sin stock',
          icon: <Icon name="AlertTriangle" size={18} />,
          iconClassName: 'bg-error/10 text-error',
        },
      ]
    : [];

  const filtered = items;

  const COLUMNS = useMemo(
    () => [
      columnHelper.display({
        id: 'expand',
        header: '',
        cell: (info) => {
          const hasStocks = info.row.original.stocks.length > 0;
          if (!hasStocks) return null;
          const isOpen = expandedRows.has(info.row.original.uid);
          return (
            <button
              onClick={() => toggleRow(info.row.original.uid)}
              className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={15} />
            </button>
          );
        },
      }),
      columnHelper.accessor('name', {
        header: 'Producto',
        cell: (info) => (
          <div>
            <p className="text-subtitle2 text-foreground">{info.getValue()}</p>
            <p className="text-caption text-muted-foreground font-mono">{info.row.original.sku}</p>
          </div>
        ),
      }),
      columnHelper.accessor('category_name', {
        header: 'Categoría',
        cell: (info) =>
          info.getValue() ? (
            <span className="text-body2 text-muted-foreground">{info.getValue()}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      }),
      columnHelper.accessor('stock_physical_total', {
        header: () => <div className="text-right w-full">Físico</div>,
        cell: (info) => (
          <div className="text-right font-semibold text-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor('stock_reserved_total', {
        header: () => <div className="text-right w-full">Reservado</div>,
        cell: (info) => <div className="text-right text-muted-foreground">{info.getValue()}</div>,
      }),
      columnHelper.accessor('stock_available_total', {
        header: () => <div className="text-right w-full font-semibold">Disponible</div>,
        cell: (info) => {
          const val = info.getValue();
          return (
            <div className={cn('text-right font-bold', val <= 0 ? 'text-error' : 'text-success')}>
              {val}
            </div>
          );
        },
      }),
      columnHelper.accessor('stock_state', {
        header: 'Estado',
        cell: (info) => <StockBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdjustProduct(info.row.original);
              setAdjustDrawerOpen(true);
            }}
            className="cursor-pointer text-xs"
          >
            <Icon name="SlidersHorizontal" size={13} />
            Ajustar
          </Button>
        ),
      }),
    ],
    [expandedRows]
  );

  const { table, dense, onChangeDense } = useTable({
    data: filtered,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  if (isLoading)
    return (
      <InventoryPageSkeleton
        title="Stock Disponible"
        subtitle="Disponibilidad de inventario por bodega"
      />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Stock Disponible"
        subtitle="Disponibilidad de inventario por bodega"
        action={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <Button
              color="primary"
              size="sm"
              onClick={() => {
                setAdjustProduct(null);
                setAdjustDrawerOpen(true);
              }}
            >
              <Icon name="SlidersHorizontal" size={15} />
              Ajustar stock
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
        <StockFilters
          search={search}
          onSearch={setSearch}
          filterCategory={filterCategory}
          onFilterCategory={setFilterCategory}
          onCategorySearch={setCategorySearch}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterWarehouse={filterWarehouse}
          onFilterWarehouse={setFilterWarehouse}
          onWarehouseSearch={setWarehouseSearch}
          categories={categories}
          warehouses={warehouses}
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
                        <WarehouseBreakdownRow stocks={row.original.stocks} />
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

      <StockAdjustmentDrawer
        open={adjustDrawerOpen}
        productUid={adjustProduct?.uid}
        product={adjustProduct ?? undefined}
        warehouses={warehouses}
        onSuccess={refetch}
        onClose={() => setAdjustDrawerOpen(false)}
      />
    </PageContainer>
  );
}
