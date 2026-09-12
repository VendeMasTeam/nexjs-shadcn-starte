'use client';

import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMoney } from 'src/lib/currency';
import { formatDate } from 'src/lib/date';
import { queryKeys } from 'src/lib/query-keys';
import { paths } from 'src/routes/paths';
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
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useLeadOrigins } from 'src/shared/hooks/useTenantOptions';
import { useDebounce } from 'use-debounce';

import { SalesPageSkeleton } from '../components/SalesPageSkeleton';
import { useOpportunityHistory } from '../hooks/useOpportunityHistory';
import { opportunityService } from '../services/opportunity.service';
import type { Opportunity } from '../types/sales.types';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activas' },
  { value: 'open', label: 'Abiertas' },
  { value: 'closed', label: 'Cerradas' },
  { value: 'won', label: 'Ganadas' },
  { value: 'lost', label: 'Perdidas' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  won: { label: 'Ganada', className: 'bg-emerald-500/10 text-emerald-600' },
  lost: { label: 'Perdida', className: 'bg-destructive/10 text-destructive' },
};

function opportunityStatusLabel(opp: Opportunity) {
  if (opp.closed_status === 'won' || opp.won_at) return STATUS_BADGE.won;
  if (opp.closed_status === 'lost' || opp.lost_at) return STATUS_BADGE.lost;
  return { label: opp.stage_name || 'Activa', className: 'bg-muted/40 text-muted-foreground' };
}

const col = createColumnHelper<Opportunity>();

export function OpportunityHistoryView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [stageUid, setStageUid] = useState('');
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [closedFrom, setClosedFrom] = useState('');
  const [closedTo, setClosedTo] = useState('');

  const { data: stages = [] } = useQuery({
    queryKey: queryKeys.sales.stages,
    queryFn: () => opportunityService.getStages(),
    staleTime: 0,
  });

  const leadOrigins = useLeadOrigins();

  const { items, isLoading, pagination } = useOpportunityHistory({
    stage_uid: stageUid || undefined,
    origin: origin || undefined,
    status: (status || undefined) as 'active' | 'open' | 'closed' | 'won' | 'lost' | undefined,
    created_from: createdFrom || undefined,
    created_to: createdTo || undefined,
    closed_from: closedFrom || undefined,
    closed_to: closedTo || undefined,
  });

  // El search vive en pagination (resetea a página 1 al cambiar) — lo sincronizamos con el debounce local
  if (debouncedSearch !== pagination.search) pagination.onChangeSearch(debouncedSearch);

  const stageOptions = [
    { value: '', label: 'Todas las etapas' },
    ...stages.map((s: { uid: string; name: string }) => ({ value: s.uid, label: s.name })),
  ];
  const originOptions = [
    { value: '', label: 'Todos los orígenes' },
    ...(leadOrigins.data ?? []).map((o: { key: string; name: string }) => ({
      value: o.key,
      label: o.name,
    })),
  ];

  const columns = useMemo(
    () => [
      col.accessor('title', {
        header: 'Oportunidad',
        cell: (info) => (
          <span className="font-medium text-foreground">
            {info.getValue() || info.row.original.uid}
          </span>
        ),
      }),
      col.accessor('stage_name', {
        header: 'Etapa',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      col.accessor('amount', {
        header: 'Monto',
        cell: (info) => (
          <span className="font-semibold text-foreground">
            {formatMoney(Number(info.getValue()) || 0, {
              scope: 'tenant',
              maximumFractionDigits: 0,
            })}
          </span>
        ),
      }),
      col.display({
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const cfg = opportunityStatusLabel(row.original);
          return (
            <Badge
              variant="soft"
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border-none ${cfg.className}`}
            >
              {cfg.label}
            </Badge>
          );
        },
      }),
      col.accessor('created_at', {
        header: 'Creada',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">
            {info.getValue() ? formatDate(info.getValue()) : '—'}
          </span>
        ),
      }),
      col.display({
        id: 'closed_at',
        header: 'Cerrada',
        cell: ({ row }) => {
          const closedAt = row.original.closed_at ?? row.original.won_at ?? row.original.lost_at;
          return (
            <span className="text-body2 text-muted-foreground">
              {closedAt ? formatDate(closedAt) : '—'}
            </span>
          );
        },
      }),
    ],
    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: items,
    columns,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  if (isLoading && items.length === 0) {
    return (
      <SalesPageSkeleton
        title="Historial de Oportunidades"
        subtitle="Cargando historial completo..."
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Historial de Oportunidades"
        subtitle={`${pagination.total} oportunidad${pagination.total !== 1 ? 'es' : ''} en total`}
        action={
          <Button variant="outline" onClick={() => router.push(paths.sales.pipeline)}>
            <Icon name="ChevronLeft" size={16} />
            Volver al pipeline
          </Button>
        }
      />

      {/* Filtros — todos server-side */}
      <SectionCard className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Buscar"
            placeholder="Buscar por oportunidad o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={15} />}
            className="flex-1 min-w-48"
          />
          <SelectField
            label="Etapa"
            options={stageOptions}
            value={stageUid}
            onChange={(v) => setStageUid(v as string)}
            className="w-full sm:w-48"
          />
          <SelectField
            label="Origen"
            options={originOptions}
            value={origin}
            onChange={(v) => setOrigin(v as string)}
            className="w-full sm:w-44"
          />
          <SelectField
            label="Estado"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => setStatus(v as string)}
            className="w-full sm:w-44"
          />
          <Input
            label="Creada desde"
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            label="Creada hasta"
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            label="Cerrada desde"
            type="date"
            value={closedFrom}
            onChange={(e) => setClosedFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <Input
            label="Cerrada hasta"
            type="date"
            value={closedTo}
            onChange={(e) => setClosedTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </SectionCard>

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
                      <Icon name="Box" size={32} className="opacity-30" />
                      <span className="text-sm">Sin resultados para los filtros aplicados</span>
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
    </PageContainer>
  );
}
