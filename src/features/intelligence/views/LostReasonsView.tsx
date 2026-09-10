'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { formatMoney } from 'src/lib/currency';
import { formatDate } from 'src/lib/date';
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
import { Badge, Button, Icon, Input, SelectField } from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { useLostReasonCategories } from 'src/shared/hooks/useTenantOptions';

import { LostReasonDrawer } from '../components/LostReasonDrawer';
import { LostReasonHeatmap } from '../components/LostReasonHeatmap';
import { useIntelligence } from '../hooks/useIntelligence';
import type { LostReason } from '../types';
const col = createColumnHelper<LostReason>();

export function LostReasonsView() {
  const [reasonFilter, setReasonFilter] = useState('');
  const [competitorFilter, setCompetitorFilter] = useState('');

  const {
    lostReasons,
    stats,
    competitors,
    heatmapData,
    createLostReason,
    updateLostReason,
    deleteLostReason,
    lostReasonsPagination: pagination,
  } = useIntelligence({
    lostReasonType: reasonFilter || undefined,
    lostReasonCompetitorUid: competitorFilter || undefined,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LostReason | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LostReason | null>(null);

  const lostReasonCategories = useLostReasonCategories();

  const reasonOptions = useMemo(() => {
    const data = lostReasonCategories.data as
      | { uid: string; name: string; key: string }[]
      | undefined;
    if (!data || data.length === 0) return [{ value: '', label: 'Todas las razones' }];
    return [
      { value: '', label: 'Todas las razones' },
      ...data.map((opt) => ({ value: opt.key, label: opt.name })),
    ];
  }, [lostReasonCategories.data]);

  const reasonLabels = useMemo(() => {
    const data = lostReasonCategories.data as
      | { uid: string; name: string; key: string }[]
      | undefined;
    const map: Record<string, string> = {};
    if (data) for (const opt of data) map[opt.key] = opt.name;
    return map;
  }, [lostReasonCategories.data]);

  const COMPETITOR_FILTER_OPTIONS = useMemo(
    () => [
      { value: '', label: 'Todos los competidores' },
      { value: 'none', label: 'Sin competidor' },
      ...competitors.map((c) => ({ value: c.uid, label: c.name })),
    ],
    [competitors]
  );

  const columns = useMemo(
    () => [
      col.accessor('summary', {
        header: 'Deal',
        cell: (info) => (
          <div>
            <p className="text-body2 font-medium text-foreground">{info.getValue()}</p>
            <p className="text-caption text-muted-foreground">{info.row.original.account_name}</p>
          </div>
        ),
      }),
      col.accessor('deal_value', {
        header: 'Monto',
        cell: (info) => (
          <span className="text-body2 font-semibold text-foreground">
            {formatMoney(info.getValue() ?? 0, { maximumFractionDigits: 0 })}
          </span>
        ),
      }),
      col.accessor('competitor_name', {
        header: 'Competidor',
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="soft" color="error">
              {info.getValue()}
            </Badge>
          ) : (
            <span className="text-caption text-muted-foreground">—</span>
          ),
      }),
      col.accessor('lost_reason_category', {
        header: 'Razón',
        cell: (info) => (
          <Badge variant="soft" color="warning">
            {reasonLabels[info.getValue()] || info.getValue()}
          </Badge>
        ),
      }),
      col.accessor('lost_at', {
        header: 'Fecha',
        cell: (info) => (
          <span className="text-caption text-muted-foreground">{formatDate(info.getValue())}</span>
        ),
      }),
      col.accessor('sales_rep', {
        header: 'Vendedor',
        cell: (info) => <span className="text-body2">{info.getValue()}</span>,
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row.original);
                setDrawerOpen(true);
              }}
            >
              <Icon name="Pencil" size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row.original);
              }}
            >
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        ),
      }),
    ],
    [reasonLabels]
  );

  const { table, dense, onChangeDense } = useTable({
    data: lostReasons,
    columns,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const handleClose = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Razones de Pérdida"
        subtitle={`${lostReasons.length} deals registrados`}
        action={
          <Button color="primary" onClick={() => setDrawerOpen(true)}>
            <Icon name="Plus" size={16} />
            Registrar pérdida
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Deals perdidos"
          value={stats.total_lost_deals}
          icon={<Icon name="TrendingDown" size={18} />}
          iconClassName="bg-error/10 text-error"
          trendUp={false}
        />
        <StatsCard
          title="Monto total perdido"
          value={`$${(stats.total_lost_amount / 1000).toFixed(0)}k`}
          icon={<Icon name="DollarSign" size={18} />}
          iconClassName="bg-warning/10 text-warning"
          trendUp={false}
        />
        <StatsCard
          title="Razón principal"
          value={reasonLabels[stats.top_lost_reason] || stats.top_lost_reason}
          icon={<Icon name="AlertCircle" size={18} />}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatsCard
          title="Competidor más frecuente"
          value={stats.top_competitor}
          icon={<Icon name="Swords" size={18} />}
          iconClassName="bg-error/10 text-error"
        />
      </div>

      {/* Heatmap */}
      <LostReasonHeatmap data={heatmapData} competitors={competitors} />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            label="Buscar"
            placeholder="Buscar deal o cliente..."
            value={pagination.search ?? ''}
            onChange={(e) => pagination.onChangeSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={15} />}
          />
        </div>
        <div className="min-w-[200px]">
          <SelectField
            label="Razón"
            options={reasonOptions}
            value={reasonFilter}
            onChange={(v) => setReasonFilter(v as string)}
            placeholder="Todas las razones"
            clearable
          />
        </div>
        <div className="min-w-[200px]">
          <SelectField
            label="Competidor"
            options={COMPETITOR_FILTER_OPTIONS}
            value={competitorFilter}
            onChange={(v) => setCompetitorFilter(v as string)}
            placeholder="Todos los competidores"
            clearable
          />
        </div>
      </div>

      {/* Tabla */}
      <SectionCard noPadding>
        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Icon name="TrendingDown" size={32} className="opacity-30" />
                      <span className="text-body2">Sin deals que coincidan con los filtros</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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

      <LostReasonDrawer
        open={drawerOpen}
        item={editing}
        competitors={competitors}
        onClose={handleClose}
        onCreate={createLostReason}
        onUpdate={updateLostReason}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteLostReason(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar razón de pérdida?"
        description={
          <>
            Vas a eliminar la razón de pérdida de <strong>{deleteTarget?.summary}</strong>. Esta
            acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
