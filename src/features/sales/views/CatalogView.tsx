'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { EditButton, MoreActionsMenu } from 'src/shared/components/ui/action-buttons';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useDebounce } from 'use-debounce';

import { CatalogProductDrawer } from '../components/CatalogProductDrawer';
import { useCatalogProducts } from '../hooks/useCatalogProducts';
import { catalogService } from '../services/catalog.service';
import type { CatalogProduct, CreateCatalogProductPayload } from '../types/catalog.types';

const col = createColumnHelper<CatalogProduct>();

const TYPE_COLORS: Record<string, string> = {
  product: 'bg-blue-500/10 text-blue-600',
  service: 'bg-violet-500/10 text-violet-600',
};

const TYPE_LABELS: Record<string, string> = {
  product: 'Producto',
  service: 'Servicio',
};

const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'product', label: 'Producto' },
  { value: 'service', label: 'Servicio' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export function CatalogView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);

  const {
    items: products,
    isLoading,
    pagination,
    refetch,
  } = useCatalogProducts({
    search: debouncedSearch || undefined,
    type: (typeFilter as 'product' | 'service') || undefined,
    status: (statusFilter as 'active' | 'inactive') || undefined,
  });

  const handleSave = async (payload: CreateCatalogProductPayload) => {
    if (selected) {
      await catalogService.update(selected.uid, payload);
      toast.success('Producto actualizado');
    } else {
      await catalogService.create(payload);
      toast.success('Producto creado');
    }
    refetch();
  };

  const handleDeactivate = async (product: CatalogProduct) => {
    try {
      await catalogService.deactivate(product.uid);
      toast.success('Producto desactivado');
      refetch();
    } catch {
      toast.error('Error al desactivar el producto');
    }
  };

  const openCreate = () => {
    setSelected(null);
    setDrawerOpen(true);
  };

  const openEdit = (product: CatalogProduct) => {
    setSelected(product);
    setDrawerOpen(true);
  };

  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: 'Producto',
        cell: (info) => (
          <div>
            <p className="font-medium text-foreground">{info.getValue()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{info.row.original.sku}</p>
          </div>
        ),
      }),
      col.accessor('type', {
        header: 'Tipo',
        cell: (info) => (
          <Badge
            variant="soft"
            className={`text-xs px-2.5 py-0.5 rounded-full border-none ${TYPE_COLORS[info.getValue()]}`}
          >
            {TYPE_LABELS[info.getValue()]}
          </Badge>
        ),
      }),
      col.display({
        id: 'price',
        header: 'Precio base',
        cell: ({ row }) => {
          const p = row.original;
          const price = p.default_price ?? p.inventory_product?.sale_price;
          return (
            <span className="font-semibold text-foreground">
              {price != null ? formatMoney(price, { scope: 'tenant' }) : '—'}
            </span>
          );
        },
      }),
      col.display({
        id: 'stock',
        header: 'Stock',
        cell: ({ row }) => {
          const p = row.original;
          if (p.type !== 'product' || !p.inventory_product)
            return <span className="text-muted-foreground">—</span>;
          const stock = p.inventory_product.stock_available_total;
          return (
            <span className={`font-semibold ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {stock}
            </span>
          );
        },
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: (info) => (
          <Badge
            variant="soft"
            className={`text-xs px-2.5 py-0.5 rounded-full border-none ${
              info.getValue() === 'active'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {info.getValue() === 'active' ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <EditButton onClick={() => openEdit(p)} />
              <MoreActionsMenu
                items={[
                  {
                    label: p.status === 'active' ? 'Desactivar' : 'Activar',
                    icon: <Icon name={p.status === 'active' ? 'EyeOff' : 'Eye'} size={14} />,
                    color: p.status === 'active' ? 'error' : 'primary',
                    onClick: () => handleDeactivate(p),
                  },
                ]}
              />
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: products,
    columns,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Catálogo Comercial"
        subtitle={`${pagination.total} producto${pagination.total !== 1 ? 's' : ''}`}
        action={
          <Button color="primary" onClick={openCreate}>
            <Icon name="Plus" size={16} />
            Nuevo producto
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          label="Buscar"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Icon name="Search" size={15} />}
          className="sm:max-w-xs"
        />
        <SelectField
          label="Tipo"
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as string)}
          options={TYPE_OPTIONS}
          className="sm:w-48"
        />
        <SelectField
          label="Estado"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as string)}
          options={STATUS_OPTIONS}
          className="sm:w-48"
        />
      </div>

      <SectionCard noPadding>
        <TableContainer>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeadCustom table={table} />
              <TableBody dense={dense}>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Icon name="BookOpen" size={32} className="opacity-30" />
                        <span className="text-sm">
                          {search || typeFilter || statusFilter
                            ? 'Sin resultados para los filtros aplicados'
                            : 'No hay productos en el catálogo'}
                        </span>
                        {!search && !typeFilter && !statusFilter && (
                          <Button variant="outline" size="sm" onClick={openCreate}>
                            Agregar el primero
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(row.original)}
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
          )}
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

      <CatalogProductDrawer
        open={drawerOpen}
        mode={selected ? 'edit' : 'create'}
        product={selected}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </PageContainer>
  );
}
