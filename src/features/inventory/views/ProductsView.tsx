'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { endpoints } from 'src/lib/axios';
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
import { Badge, Button, EditButton, Icon } from 'src/shared/components/ui';
import { DeleteButton } from 'src/shared/components/ui/action-buttons';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { useDebounce } from 'use-debounce';

import { InventoryPageSkeleton } from '../components/InventoryPageSkeleton';
import { ProductDrawer, type ProductDrawerMode } from '../components/ProductDrawer';
import { ProductFilters } from '../components/ProductFilters';
import { StockBadge } from '../components/StockBadge';
import { useCategories } from '../hooks/use-categories';
import { useProducts } from '../hooks/use-products';
import { useWarehouses } from '../hooks/use-warehouses';
import type { CreateProductPayload, InventoryMasterItem } from '../types/inventory.types';

const columnHelper = createColumnHelper<InventoryMasterItem>();

export function ProductsView() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<ProductDrawerMode>('create');
  const [selectedProduct, setSelectedProduct] = useState<InventoryMasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryMasterItem | null>(null);

  const [debouncedSearch] = useDebounce(search, 400);
  const [debouncedCategorySearch] = useDebounce(categorySearch, 400);
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch, 400);

  const stock_state = ['normal', 'low', 'out'].includes(filterStatus)
    ? (filterStatus as 'normal' | 'low' | 'out')
    : undefined;

  const { items, summary, isLoading, createProduct, updateProduct, removeProduct, pagination } =
    useProducts({
      category_uid: filterCategory !== 'all' ? filterCategory : undefined,
      warehouse_uid: filterWarehouse !== 'all' ? filterWarehouse : undefined,
      stock_state,
      search: debouncedSearch || undefined,
      is_active: filterStatus === 'inactive' ? false : undefined,
    });

  const { categories: filterCategories } = useCategories({
    search: debouncedCategorySearch || undefined,
    per_page: 15,
  });

  const { items: warehouseItems } = useWarehouses({
    search: debouncedWarehouseSearch || undefined,
  });
  const warehouseOptions = useMemo(
    () => warehouseItems.map((w) => ({ uid: w.uid, name: w.name })),
    [warehouseItems]
  );

  const statsCards = summary
    ? [
        {
          title: 'Total productos',
          value: summary.products,
          badge: 'en catálogo',
          icon: <Icon name="Package" size={18} />,
          iconClassName: 'bg-primary/10 text-primary',
        },
        {
          title: 'Productos activos',
          value: summary.active_products,
          badge: `${summary.products > 0 ? Math.round((summary.active_products / summary.products) * 100) : 0}% del total`,
          icon: <Icon name="CheckCircle" size={18} />,
          iconClassName: 'bg-success/10 text-success',
        },
        {
          title: 'Productos sin stock',
          value: summary.out_of_stock_count,
          badge: `${summary.products > 0 ? Math.round((summary.out_of_stock_count / summary.products) * 100) : 0}% del total`,
          icon: <Icon name="XCircle" size={18} />,
          iconClassName: 'bg-error/10 text-error',
        },
        {
          title: 'Stock físico total',
          value: summary.total_physical_stock?.toLocaleString() ?? '0',
          badge: 'unidades en sistema',
          icon: <Icon name="Box" size={18} />,
          iconClassName: 'bg-info/10 text-info',
        },
      ]
    : [];

  const COLUMNS = useMemo(
    () => [
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
            <Badge variant="soft" color="secondary">
              {info.getValue()}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      }),
      columnHelper.accessor('stock_physical_total', {
        header: () => <div className="text-right w-full">Stock total</div>,
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
      columnHelper.accessor('is_active', {
        header: 'Activo',
        cell: (info) => (
          <Badge
            variant={info.getValue() ? 'soft' : 'outline'}
            color={info.getValue() ? 'success' : 'default'}
          >
            {info.getValue() ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex items-center justify-end gap-1">
            <EditButton
              onClick={() => {
                setSelectedProduct(info.row.original);
                setDrawerMode('edit');
                setDrawerOpen(true);
              }}
            />
            <DeleteButton onClick={() => setDeleteTarget(info.row.original)} />
          </div>
        ),
      }),
    ],
    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: items,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const handleSave = async (payload: CreateProductPayload) => {
    if (drawerMode === 'create') {
      await createProduct(payload);
    } else if (selectedProduct) {
      await updateProduct(selectedProduct.uid, payload);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    await downloadExport({
      endpoint: endpoints.productsExport,
      format,
      filters: {
        search,
        category_uid: filterCategory !== 'all' ? filterCategory : undefined,
        warehouse_uid: filterWarehouse !== 'all' ? filterWarehouse : undefined,
        is_active: filterStatus !== 'all' ? filterStatus === 'active' : undefined,
      },
      filename: `productos.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    });
  };

  if (isLoading)
    return (
      <InventoryPageSkeleton title="Productos" subtitle="Gestión del catálogo de inventario" />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Productos"
        subtitle="Gestión del catálogo de inventario"
        action={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <Button
              color="primary"
              size="sm"
              onClick={() => {
                setSelectedProduct(null);
                setDrawerMode('create');
                setDrawerOpen(true);
              }}
            >
              <Icon name="Plus" size={16} />
              Nuevo producto
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
        <ProductFilters
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
          categories={filterCategories}
          warehouses={warehouseOptions}
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

      <ProductDrawer
        open={drawerOpen}
        mode={drawerMode}
        product={selectedProduct}
        warehouses={warehouseOptions}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeProduct(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar producto?"
        description={
          <>
            Vas a eliminar <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
