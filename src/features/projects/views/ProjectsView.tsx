'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatDate } from 'src/lib/date';
import { cn } from 'src/lib/utils';
import { paths } from 'src/routes/paths';
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
import { Button, Icon, Input, SelectField } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { ProjectDrawer } from '../components/ProjectDrawer';
import { ProjectStatusBadge } from '../components/ProjectStatusBadge';
import { useProjects } from '../hooks/useProjects';
import type { Project, ProjectPayload, ProjectStatus } from '../types';
import { PROJECT_STATUS_CONFIG } from '../types';

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Project>();

// ─── Progress color ───────────────────────────────────────────────────────────

function getProgressColor(progress: number, status: ProjectStatus) {
  if (status === 'completed') return 'bg-success';
  if (status === 'cancelled') return 'bg-muted-foreground';
  if (progress <= 33) return 'bg-error';
  if (progress <= 66) return 'bg-warning';
  if (progress < 100) return 'bg-info';
  return 'bg-success';
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ProjectsView() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Pass status to hook → filters server-side via ProjectService.
  // 'all' means no filter; the hook omits the param when status === 'all'.
  const { projects, stats, createProject, updateProject, pagination, search, onChangeSearch } =
    useProjects({
      status: filterStatus !== 'all' ? filterStatus : undefined,
    });

  const [searchInput, setSearchInput] = useState(search);
  const [debouncedSearchInput] = useDebounce(searchInput, 400);
  if (debouncedSearchInput !== search) onChangeSearch(debouncedSearchInput);

  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Proyecto',
        cell: (info) => (
          <div>
            <p className="text-subtitle2 text-foreground font-medium">{info.getValue()}</p>
            <p className="text-caption text-muted-foreground">{info.row.original.client_name}</p>
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => <ProjectStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('manager', {
        header: 'Manager',
        cell: (info) => <span className="text-body2">{info.getValue()}</span>,
      }),
      columnHelper.accessor('start_date', {
        header: 'Inicio',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('end_date', {
        header: 'Fin est.',
        cell: (info) => {
          const date = new Date(info.getValue());
          const isOverdue =
            date < new Date() &&
            info.row.original.status !== 'completed' &&
            info.row.original.status !== 'cancelled';
          return (
            <span
              className={cn(
                'text-body2',
                isOverdue ? 'text-error font-medium' : 'text-muted-foreground'
              )}
            >
              {formatDate(date)}
            </span>
          );
        },
      }),
      columnHelper.accessor('progress', {
        header: 'Progreso',
        cell: (info) => {
          const progress = info.getValue();
          const status = info.row.original.status;
          const colorClass = getProgressColor(progress, status);
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', colorClass)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-caption text-muted-foreground shrink-0">{progress}%</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            className="text-muted-foreground hover:text-primary transition-colors"
            onClick={() => router.push(paths.projects.detail(info.row.original.uid))}
          >
            <Icon name="Eye" size={15} />
          </button>
        ),
      }),
    ],
    [router]
  );

  const { table, dense, onChangeDense } = useTable({
    data: projects,
    columns: COLUMNS,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const statsCards = [
    {
      title: 'Proyectos activos',
      value: stats.active,
      trend: 'en curso o planificación',
      trendUp: true,
      icon: <Icon name="FolderKanban" size={18} />,
      iconClassName: 'bg-info/10 text-info',
    },
    {
      title: 'Completados',
      value: stats.completed,
      trend: 'finalizados',
      trendUp: true,
      icon: <Icon name="CheckCircle" size={18} />,
      iconClassName: 'bg-success/10 text-success',
    },
    {
      title: 'En pausa',
      value: stats.onHold,
      trend: 'esperando acción',
      trendUp: false,
      icon: <Icon name="PauseCircle" size={18} />,
      iconClassName: 'bg-warning/10 text-warning',
    },
    {
      title: 'Hitos vencidos',
      value: stats.delayedMilestones,
      trend: 'requieren atención',
      trendUp: false,
      icon: <Icon name="AlertTriangle" size={18} />,
      iconClassName: 'bg-error/10 text-error',
    },
  ];

  const handleCreate = async (payload: ProjectPayload) => createProject(payload);
  const handleUpdate = async (uid: string, changes: Partial<ProjectPayload>) =>
    updateProject(uid, changes);
  const handleCancel = (uid: string) => {
    updateProject(uid, { status: 'cancelled' as ProjectStatus });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Proyectos"
        subtitle="Implementaciones y onboarding post-venta"
        action={
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              setSelectedProject(null);
              setDrawerMode('create');
              setDrawerOpen(true);
            }}
          >
            <Icon name="Plus" size={16} />
            Nuevo proyecto
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconClassName={card.iconClassName}
            trend={card.trend}
            trendUp={card.trendUp}
          />
        ))}
      </div>

      {/* Table */}
      <SectionCard noPadding>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por proyecto o cliente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>

          <SelectField
            label="Estado"
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => ({
                value: key,
                label: cfg.label,
              })),
            ]}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string)}
          />
        </div>

        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.map((row) => {
                const hasDelayed = row.original.milestones.some((m) => m.status === 'delayed');
                const showAlert =
                  hasDelayed &&
                  row.original.status !== 'completed' &&
                  row.original.status !== 'cancelled';
                return (
                  <TableRow key={row.id} className={cn(showAlert && 'bg-error/5')}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
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

      <ProjectDrawer
        open={drawerOpen}
        mode={drawerMode}
        project={selectedProject}
        onClose={() => setDrawerOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
      />
    </PageContainer>
  );
}
