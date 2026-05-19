'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { extractApiError } from 'src/lib/api-errors';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeadCustom,
  TableRow,
  useTable,
} from 'src/shared/components/table';
import { Badge, Button, ConfirmDialog, DeleteButton, EditButton } from 'src/shared/components/ui';

import { CompetitorDrawer, type CompetitorFormData } from '../components/CompetitorDrawer';
import {
  type CreateCompetitorPayload,
  intelligenceService,
} from '../services/intelligence.service';

interface CompetitorRow {
  uid: string;
  name: string;
  key?: string;
  website?: string;
  strengths?: string[];
  weaknesses?: string[];
  is_active?: boolean;
}

const columnHelper = createColumnHelper<CompetitorRow>();

export function CompetitorsView({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CompetitorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompetitorRow | null>(null);

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const res = await intelligenceService.competitors.getAll();
      return ((res as unknown as { data?: CompetitorRow[] })?.data ?? []) as CompetitorRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCompetitorPayload) => intelligenceService.competitors.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast.success('Competidor creado');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<CreateCompetitorPayload> }) =>
      intelligenceService.competitors.update(uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast.success('Competidor actualizado');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (uid: string) => intelligenceService.competitors.delete(uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast.success('Competidor eliminado');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const columns = [
    columnHelper.accessor('name', {
      header: 'Nombre',
      cell: (i) => <span className="font-medium">{i.getValue()}</span>,
    }),
    columnHelper.accessor('key', {
      header: 'Clave',
      cell: (i) => <span className="text-xs text-muted-foreground font-mono">{i.getValue()}</span>,
    }),
    columnHelper.accessor('website', {
      header: 'Web',
      cell: (i) => <span className="text-sm text-muted-foreground">{i.getValue() ?? '—'}</span>,
    }),
    columnHelper.accessor('is_active', {
      header: 'Activo',
      cell: (i) =>
        i.getValue() ? (
          <Badge variant="soft" color="success" className="text-[10px]">
            Activo
          </Badge>
        ) : (
          <Badge variant="soft" className="text-[10px] bg-muted text-muted-foreground">
            Inactivo
          </Badge>
        ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: (i) => (
        <div className="flex gap-1 justify-end">
          <EditButton
            onClick={() => {
              setEditing(i.row.original);
              setDrawerOpen(true);
            }}
          />
          <DeleteButton onClick={() => setDeleteTarget(i.row.original)} />
        </div>
      ),
    }),
  ];

  const { table } = useTable({ data: competitors, columns });

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const handleSave = async (data: CompetitorFormData) => {
    if (editing) {
      await updateMutation.mutateAsync({ uid: editing.uid, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Competidores"
        subtitle="Gestioná los competidores para battlecards e inteligencia competitiva"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (onClose ? onClose() : router.back())}>
              ← Volver
            </Button>
            <Button color="primary" onClick={openCreate}>
              + Nuevo
            </Button>
          </div>
        }
      />
      <SectionCard noPadding>
        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Sin competidores. Crea el primero.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((r) => (
                  <TableRow key={r.id}>
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id}>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <CompetitorDrawer
        open={drawerOpen}
        competitor={
          editing
            ? {
                name: editing.name,
                key: editing.key ?? '',
                website: editing.website,
                strengths: editing.strengths ?? [],
                weaknesses: editing.weaknesses ?? [],
                is_active: editing.is_active ?? true,
              }
            : null
        }
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="Eliminar competidor"
        description={`¿Eliminar ${deleteTarget?.name}?`}
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
