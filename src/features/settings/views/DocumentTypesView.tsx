'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
} from 'src/shared/components/ui';
import { DeleteButton, EditButton } from 'src/shared/components/ui/action-buttons';
import { Badge } from 'src/shared/components/ui/badge';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { useDebounce } from 'use-debounce';

import { useDocumentTypes } from '../hooks/use-document-types';
import type { DocumentType } from '../types/document-type.types';

const columnHelper = createColumnHelper<DocumentType>();

const COLUMNS = (onEdit: (dt: DocumentType) => void, onDelete: (dt: DocumentType) => void) => [
  columnHelper.accessor('name', {
    header: 'Nombre',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('description', {
    header: 'Descripción',
    cell: (info) => <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('validity_days', {
    header: 'Vigencia',
    cell: (info) => {
      const val = info.getValue();
      return <span className="text-sm text-muted-foreground">{val ? `${val} días` : '—'}</span>;
    },
  }),
  columnHelper.accessor('is_required', {
    header: 'Requerido',
    cell: (info) =>
      info.getValue() ? (
        <Badge
          variant="soft"
          className="bg-red-50 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border-none"
        >
          Requerido
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Opcional</span>
      ),
  }),
  columnHelper.accessor('is_active', {
    header: 'Estado',
    cell: (info) =>
      info.getValue() ? (
        <Badge
          variant="soft"
          className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border-none"
        >
          Activo
        </Badge>
      ) : (
        <Badge
          variant="soft"
          className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border-none"
        >
          Inactivo
        </Badge>
      ),
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

export function DocumentTypesView() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const {
    documentTypes,
    isLoading,
    isError,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
  } = useDocumentTypes({ search: debouncedSearch || undefined });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function handleEdit(dt: DocumentType) {
    setEditing(dt);
    setName(dt.name);
    setDescription(dt.description ?? '');
    setValidityDays(dt.validity_days?.toString() ?? '');
    setIsRequired(dt.is_required);
    setIsActive(dt.is_active);
    setDrawerOpen(true);
  }

  const columns = useMemo(
    () => COLUMNS(handleEdit, (dt) => setDeleteTarget(dt)),

    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: documentTypes,
    columns,
    defaultRowsPerPage: 10,
  });

  function openCreate() {
    setEditing(null);
    setName('');
    setDescription('');
    setValidityDays('');
    setIsRequired(false);
    setIsActive(true);
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        validity_days: validityDays ? Number(validityDays) : undefined,
        is_required: isRequired,
        is_active: isActive,
      };
      if (editing) {
        await updateDocumentType.mutateAsync({ uid: editing.uid, payload });
      } else {
        await createDocumentType.mutateAsync(payload);
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Tipos de Documento"
        subtitle="Configurá los tipos de documentos requeridos para cuentas y contactos."
        action={
          <Button color="primary" onClick={openCreate} className="gap-2">
            <Icon name="Plus" size={16} />
            Nuevo Tipo
          </Button>
        }
      />

      <SectionCard noPadding>
        <div className="flex flex-col sm:flex-row gap-3 items-end px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={16} />}
            className="flex-1 max-w-sm"
          />
        </div>
        <TableContainer className="relative">
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground text-sm"
                  >
                    {isLoading
                      ? 'Cargando...'
                      : isError
                        ? 'Error al cargar los tipos de documento. Intenta recargar la página.'
                        : 'No hay tipos de documento. Usa el botón "Nuevo Tipo" para crear el primero.'}
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
          <TablePaginationCustom table={table} dense={dense} onChangeDense={onChangeDense} />
        </div>
      </SectionCard>

      {/* Drawer: Create / Edit */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editing ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {editing
                ? 'Edita los datos del tipo de documento.'
                : 'Completa el formulario para crear un nuevo tipo de documento.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 py-6 flex-1 overflow-y-auto">
            <Input
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Certificado Fiscal"
            />
            <Textarea
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional — describí el propósito de este tipo de documento"
              className="min-h-[60px] resize-none"
            />
            <Input
              label="Días de vigencia"
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              placeholder="Ej: 365 (dejar vacío si no expira)"
            />
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">¿Es requerido?</span>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">¿Está activo?</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button color="primary" onClick={handleSave} disabled={saving || !name.trim()}>
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
          if (deleteTarget) deleteDocumentType.mutate(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar tipo de documento?"
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
