'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from 'src/lib/date';
import { cn } from 'src/lib/utils';
import { paths } from 'src/routes/paths';
import { PageContainer, SectionCard } from 'src/shared/components/layouts/page';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeadCustom,
  TableRow,
  useTable,
} from 'src/shared/components/table';
import {
  Badge,
  Button,
  ConfirmDialog,
  DeleteButton,
  EditButton,
  Icon,
} from 'src/shared/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/shared/components/ui';

import { MilestoneDrawer } from '../components/MilestoneDrawer';
import { MilestoneStatusBadge } from '../components/MilestoneStatusBadge';
import { ProjectDrawer } from '../components/ProjectDrawer';
import { ProjectStatusBadge } from '../components/ProjectStatusBadge';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { useProjects } from '../hooks/useProjects';
import type { Milestone, ProjectResource } from '../types';
import { RESOURCE_ROLE_CONFIG } from '../types';

// ─── Column helpers ───────────────────────────────────────────────────────────

const msColumnHelper = createColumnHelper<Milestone>();

// ─── Progress color ───────────────────────────────────────────────────────────

function getProgressColor(progress: number) {
  if (progress <= 33) return 'bg-error';
  if (progress <= 66) return 'bg-warning';
  if (progress < 100) return 'bg-info';
  return 'bg-success';
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Icon name={icon as 'Flag'} size={22} className="text-muted-foreground" />
      </div>
      <p className="text-subtitle2 text-foreground font-medium">{title}</p>
      <p className="text-caption text-muted-foreground mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}

// ─── Resource Card ────────────────────────────────────────────────────────────

function ResourceCard({ resource, onRemove }: { resource: ProjectResource; onRemove: () => void }) {
  const roleConfig = RESOURCE_ROLE_CONFIG[resource.role];
  const initials = resource.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SectionCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-subtitle2 font-semibold text-foreground truncate">{resource.name}</p>
          <Badge variant="soft" color={roleConfig.color} className="mt-0.5 text-[10px]">
            {roleConfig.label}
          </Badge>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Icon name="Mail" size={12} />
          <span className="truncate">{resource.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <Icon name="Calendar" size={12} />
          <span>
            {formatDate(resource.start_date)}
            {resource.end_date ? ` — ${formatDate(resource.end_date)}` : ' → presente'}
          </span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/40">
        <Button variant="outline" color="error" size="sm" className="w-full" onClick={onRemove}>
          Remover
        </Button>
      </div>
    </SectionCard>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export function ProjectDetailView({ projectId }: Props) {
  const router = useRouter();
  const {
    projects,
    createProject,
    updateProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addResource,
    removeResource,
  } = useProjects();

  const project = projects.find((p) => p.uid === projectId);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [msDrawerOpen, setMsDrawerOpen] = useState(false);
  const [msDrawerMode, setMsDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [resDrawerOpen, setResDrawerOpen] = useState(false);
  const [deleteMsDialog, setDeleteMsDialog] = useState<{ open: boolean; uid: string }>({
    open: false,
    uid: '',
  });
  const [removeResDialog, setRemoveResDialog] = useState<{ open: boolean; uid: string }>({
    open: false,
    uid: '',
  });

  const MS_COLUMNS = [
    msColumnHelper.accessor('name', {
      header: 'Hito',
      cell: (info) => (
        <div>
          <p className="text-subtitle2 text-foreground">{info.getValue()}</p>
          {info.row.original.description && (
            <p className="text-caption text-muted-foreground line-clamp-1">
              {info.row.original.description}
            </p>
          )}
        </div>
      ),
    }),
    msColumnHelper.accessor('assigned_to_name', {
      header: 'Responsable',
      cell: (info) => <span className="text-body2">{info.getValue() ?? '—'}</span>,
    }),
    msColumnHelper.accessor('due_date', {
      header: 'Fecha límite',
      cell: (info) => {
        const isDelayed = info.row.original.status === 'delayed';
        return (
          <span
            className={cn(
              'text-body2',
              isDelayed ? 'text-error font-medium' : 'text-muted-foreground'
            )}
          >
            {formatDate(info.getValue())}
          </span>
        );
      },
    }),
    msColumnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => <MilestoneStatusBadge status={info.getValue()} />,
    }),
    msColumnHelper.display({
      id: 'ms-actions',
      header: '',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <EditButton
            onClick={() => {
              setSelectedMilestone(info.row.original);
              setMsDrawerMode('edit');
              setMsDrawerOpen(true);
            }}
          />
          <DeleteButton
            onClick={() => setDeleteMsDialog({ open: true, uid: info.row.original.uid })}
          />
        </div>
      ),
    }),
  ];

  const { table: msTable, dense: msDense } = useTable({
    data: project?.milestones ?? [],
    columns: MS_COLUMNS,
    defaultRowsPerPage: 50,
  });

  if (!project) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="FolderX" size={48} className="text-muted-foreground mb-4" />
          <p className="text-h6 font-semibold">Proyecto no encontrado</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push(paths.projects.root)}
          >
            <Icon name="ArrowLeft" size={15} />
            Volver a Proyectos
          </Button>
        </div>
      </PageContainer>
    );
  }

  const progressColor = getProgressColor(project.progress);
  const isOverdue =
    new Date(project.end_date) < new Date() &&
    project.status !== 'completed' &&
    project.status !== 'cancelled';

  return (
    <PageContainer>
      {/* Back */}
      <button
        onClick={() => router.push(paths.projects.root)}
        className="flex items-center gap-2 text-caption text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <Icon name="ArrowLeft" size={14} />
        Proyectos
      </button>

      {/* Header card */}
      <SectionCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-h6 font-bold text-foreground">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditDrawerOpen(true)}>
            <Icon name="Pencil" size={14} />
            Editar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Cliente', value: project.client_name },
            { label: 'Manager', value: project.manager },
            {
              label: 'Inicio',
              value: formatDate(project.start_date),
            },
            {
              label: 'Fin estimado',
              value: formatDate(project.end_date),
              error: isOverdue,
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-caption text-muted-foreground">{item.label}</p>
              <p className={cn('text-body2 font-medium', item.error && 'text-error')}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-caption text-muted-foreground">Progreso</p>
            <p className="text-caption font-semibold text-foreground">
              {project.progress}% completado
            </p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {project.description && (
          <p className="text-caption text-muted-foreground mt-3">{project.description}</p>
        )}
      </SectionCard>

      {/* Tabs */}
      <Tabs defaultValue="milestones">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="milestones" className="gap-2">
            <Icon name="Flag" size={14} />
            Hitos ({project.milestones.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <Icon name="Users" size={14} />
            Recursos ({project.resources.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Hitos */}
        <TabsContent value="milestones" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              color="primary"
              size="sm"
              onClick={() => {
                setSelectedMilestone(null);
                setMsDrawerMode('create');
                setMsDrawerOpen(true);
              }}
            >
              <Icon name="Plus" size={15} />
              Agregar hito
            </Button>
          </div>

          {project.milestones.length === 0 ? (
            <EmptyState
              icon="Flag"
              title="Sin hitos definidos"
              subtitle="Agrega los hitos del proyecto para hacer seguimiento del avance."
            />
          ) : (
            <SectionCard noPadding>
              <TableContainer>
                <Table>
                  <TableHeadCustom table={msTable} />
                  <TableBody dense={msDense}>
                    {msTable.getRowModel().rows.map((row) => (
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
            </SectionCard>
          )}
        </TabsContent>

        {/* Tab Recursos */}
        <TabsContent value="resources" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button color="primary" size="sm" onClick={() => setResDrawerOpen(true)}>
              <Icon name="Plus" size={15} />
              Asignar recurso
            </Button>
          </div>

          {project.resources.length === 0 ? (
            <EmptyState
              icon="Users"
              title="Sin recursos asignados"
              subtitle="Asigná consultores o técnicos al proyecto."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.resources.map((res: ProjectResource) => (
                <ResourceCard
                  key={res.uid}
                  resource={res}
                  onRemove={() => setRemoveResDialog({ open: true, uid: res.uid })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <ProjectDrawer
        open={editDrawerOpen}
        mode="edit"
        project={project}
        onClose={() => setEditDrawerOpen(false)}
        onCreate={createProject}
        onUpdate={updateProject}
        onCancel={(uid: string) => {
          updateProject(uid, { status: 'cancelled' });
        }}
      />

      <MilestoneDrawer
        open={msDrawerOpen}
        mode={msDrawerMode}
        milestone={selectedMilestone}
        onClose={() => {
          setMsDrawerOpen(false);
          setSelectedMilestone(null);
        }}
        onSave={async (data) => {
          if (msDrawerMode === 'edit' && selectedMilestone) {
            await updateMilestone(projectId, selectedMilestone.uid, data);
            return true;
          }
          await addMilestone(projectId, data);
          return true;
        }}
      />

      <ResourceDrawer
        open={resDrawerOpen}
        onClose={() => setResDrawerOpen(false)}
        onAssign={(resource) => addResource(projectId, resource)}
      />

      <ConfirmDialog
        open={deleteMsDialog.open}
        onClose={() => setDeleteMsDialog({ open: false, uid: '' })}
        onConfirm={async () => {
          await deleteMilestone(projectId, deleteMsDialog.uid);
          setDeleteMsDialog({ open: false, uid: '' });
        }}
        title="Eliminar hito"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="error"
      />

      <ConfirmDialog
        open={removeResDialog.open}
        onClose={() => setRemoveResDialog({ open: false, uid: '' })}
        onConfirm={async () => {
          await removeResource(projectId, removeResDialog.uid);
          setRemoveResDialog({ open: false, uid: '' });
        }}
        title="Remover recurso"
        description="¿Estás seguro? El recurso será desasignado del proyecto."
        confirmLabel="Remover"
        variant="error"
      />
    </PageContainer>
  );
}
