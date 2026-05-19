'use client';

import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useState } from 'react';
import { usersService } from 'src/features/settings/services/users.service';
import { formatDate } from 'src/lib/date';
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
  ConfirmDialog,
  DeleteButton,
  EditButton,
  Icon,
  Input,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from 'src/shared/components/ui';
import { Badge } from 'src/shared/components/ui/badge';
import { useTaskPriorityOptions, useTaskStatusOptions } from 'src/shared/hooks/use-status-options';

import { useTasks } from '../hooks/use-tasks';
import type { Task, TaskPriority, TaskStatus } from '../types/task.types';

// ─── Status & Priority configs ──────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'En Progreso', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-blue-50 text-blue-600' },
  medium: { label: 'Media', color: 'bg-amber-50 text-amber-600' },
  high: { label: 'Alta', color: 'bg-orange-50 text-orange-600' },
  urgent: { label: 'Urgente', color: 'bg-red-50 text-red-600' },
};

// ─── Table columns ──────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Task>();

const COLUMNS = (onEdit: (t: Task) => void, onDelete: (t: Task) => void) => [
  columnHelper.accessor('title', {
    header: 'Tarea',
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor('priority', {
    header: 'Prioridad',
    cell: (info) => {
      const { label, color } = PRIORITY_CONFIG[info.getValue()];
      return (
        <Badge
          variant="soft"
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-none ${color}`}
        >
          {label}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: 'Estado',
    cell: (info) => {
      const { label, color } = STATUS_CONFIG[info.getValue()];
      return (
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}
        >
          {label}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('assigned_user', {
    header: 'Asignado a',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{info.getValue()?.name || '—'}</span>
    ),
  }),
  columnHelper.accessor('due_date', {
    header: 'Vence',
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="text-sm text-muted-foreground">
          {val ? formatDate(val, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      );
    },
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

// ─── View ───────────────────────────────────────────────────────────────────

export function TasksView() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks({
    search: search || undefined,
    status: filterStatus || undefined,
  });

  const { data: taskStatuses = [] } = useTaskStatusOptions();
  const { data: taskPriorities = [] } = useTaskPriorityOptions();

  // ── Users for assignment ─────────────────────────────────────────────────
  const { data: usersList } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await usersService.getAll({ per_page: 500 });
      return ((res as Record<string, unknown>).data ?? []) as Array<{ uid: string; name: string }>;
    },
    staleTime: 0,
  });
  const userOptions = (usersList ?? []).map((u) => ({ value: u.uid, label: u.name }));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState('');
  const [assignedUserUid, setAssignedUserUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });

  const { table, dense, onChangeDense } = useTable({
    data: tasks,
    columns: COLUMNS(handleEdit, handleDelete),
    defaultRowsPerPage: 10,
  });

  function handleEdit(task: Task) {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
    setAssignedUserUid(task.assigned_user?.uid || '');
    setDrawerOpen(true);
  }

  function handleDelete(task: Task) {
    setDeleteDialog({ open: true, task });
  }

  function openCreate() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('pending');
    setDueDate('');
    setAssignedUserUid('');
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        due_date: dueDate || undefined,
        assigned_user_uid: assignedUserUid || undefined,
      };
      if (editing) {
        await updateTask.mutateAsync({ uid: editing.uid, payload });
      } else {
        await createTask.mutateAsync(payload);
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Tareas"
        subtitle="Gestión de tareas con prioridad y seguimiento de estados."
        action={
          <Button color="primary" onClick={openCreate} className="gap-2">
            <Icon name="Plus" size={16} />
            Nueva Tarea
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-48">
          <Input
            label="Buscar"
            placeholder="Buscar tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={15} />}
          />
        </div>
        <SelectField
          label="Estado"
          options={[{ value: '', label: 'Todos los estados' }, ...taskStatuses]}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as string)}
        />
      </div>

      <SectionCard noPadding>
        <TableContainer className="relative">
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS(handleEdit, handleDelete).length}
                    className="py-10 text-center text-muted-foreground text-sm"
                  >
                    {isLoading
                      ? 'Cargando...'
                      : 'No hay tareas. Usa el botón "Nueva Tarea" para crear la primera.'}
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

      {/* Drawer */}
      <Sheet
        key={drawerOpen ? (editing?.uid ?? 'new') : 'closed'}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar Tarea' : 'Nueva Tarea'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-6 py-6">
            <Input
              label="Título"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué hay que hacer?"
            />
            <Textarea
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de la tarea"
              className="min-h-[80px] resize-none"
            />
            <SelectField
              label="Asignar a"
              searchable
              options={[{ value: '', label: 'Sin asignar' }, ...userOptions]}
              value={assignedUserUid}
              onChange={(v) => setAssignedUserUid(v as string)}
            />
            <SelectField
              label="Prioridad"
              options={taskPriorities}
              value={priority}
              onChange={(v) => setPriority(v as TaskPriority)}
            />
            <SelectField
              label="Estado"
              options={taskStatuses}
              value={status}
              onChange={(v) => setStatus(v as TaskStatus)}
            />
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button color="primary" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, task: null })}
        onConfirm={async () => {
          if (deleteDialog.task) {
            await deleteTask.mutateAsync(deleteDialog.task.uid);
            setDeleteDialog({ open: false, task: null });
          }
        }}
        title="Eliminar tarea"
        description={`¿Eliminar la tarea "${deleteDialog.task?.title}"?`}
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
