'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useState } from 'react';
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
import {
  Button,
  Icon,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from 'src/shared/components/ui';
import { DeleteButton, EditButton } from 'src/shared/components/ui/action-buttons';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { useDebounce } from 'use-debounce';

import { InventoryPageSkeleton } from '../components/InventoryPageSkeleton';
import { useCategories } from '../hooks/use-categories';
import type { InventoryCategory } from '../types/inventory.types';

const columnHelper = createColumnHelper<InventoryCategory>();

const COLUMNS = (
  onEdit: (cat: InventoryCategory) => void,
  onDelete: (cat: InventoryCategory) => void
) => [
  columnHelper.accessor('name', {
    header: 'Nombre',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('key', {
    header: 'Key',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('description', {
    header: 'Descripción',
    cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>,
  }),
  columnHelper.display({
    id: 'acciones',
    header: () => <div className="text-right w-full">Acciones</div>,
    cell: (info) => (
      <div className="flex items-center justify-end gap-1">
        <EditButton onClick={() => onEdit(info.row.original)} />
        <DeleteButton onClick={() => onDelete(info.row.original)} />
      </div>
    ),
  }),
];

export function CategoriesView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const { categories, isLoading, createCategory, updateCategory, deleteCategory, pagination } =
    useCategories({ search: debouncedSearch || undefined });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryCategory | null>(null);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const { table, dense, onChangeDense } = useTable({
    data: categories,
    columns: COLUMNS(handleEdit, (cat) => setDeleteTarget(cat)),
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  function handleEdit(cat: InventoryCategory) {
    setEditing(cat);
    setName(cat.name);
    setKey(cat.key);
    setDescription(cat.description ?? '');
    setDrawerOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setKey('');
    setDescription('');
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !key.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory.mutateAsync({
          uid: editing.uid,
          payload: {
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || undefined,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name: name.trim(),
          key: key.trim(),
          description: description.trim() || undefined,
        });
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading)
    return (
      <InventoryPageSkeleton
        title="Categorías"
        subtitle="Gestioná las categorías para clasificar productos del inventario."
      />
    );

  return (
    <PageContainer>
      <PageHeader
        title="Categorías de Producto"
        subtitle="Gestioná las categorías para clasificar productos del inventario."
        action={
          <Button color="primary" onClick={openCreate} className="gap-2">
            <Icon name="Plus" size={16} />
            Nueva Categoría
          </Button>
        }
      />

      <SectionCard noPadding>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="w-full max-w-sm">
            <Input
              label="Buscar"
              placeholder="Buscar por nombre o key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>
        </div>
        <TableContainer className="relative">
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS(handleEdit, (cat) => setDeleteTarget(cat)).length}
                    className="py-10 text-center text-muted-foreground text-sm"
                  >
                    {search
                      ? 'No se encontraron categorías con ese criterio.'
                      : 'No hay categorías creadas. Usa el botón "Nueva Categoría" para crear la primera.'}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5">
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
            total={pagination.total}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </div>
      </SectionCard>

      {/* Drawer: Create / Edit */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Materia Prima"
            />
            <Input
              label="Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Ej: materia_prima"
            />
            <Textarea
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional — describí el propósito de esta categoría"
              className="min-h-[80px] resize-none"
            />
          </div>

          <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleSave}
              disabled={saving || !name.trim() || !key.trim()}
            >
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteCategory.mutate(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar categoría?"
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
