'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { formatDate } from 'src/lib/date';
import { notify } from 'src/lib/notify';
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
import {
  Badge,
  Button,
  DeleteButton,
  EditButton,
  Icon,
  Input,
  SelectField,
} from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';

import { PartnerOpportunityDrawer } from '../components/PartnerOpportunityDrawer';
import { usePartners } from '../hooks/usePartners';
import type { PartnerOpportunity, PartnerOpportunityStatus } from '../types';
import { PARTNER_OPP_STATUS_CONFIG } from '../types';

// ─── Column helper ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<PartnerOpportunity>();

// ─── Main View ────────────────────────────────────────────────────────────────

export function PartnerOpportunitiesView() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPartner, setFilterPartner] = useState('all');

  const {
    opportunities,
    partners,
    opportunityStats,
    createOpportunity,
    updateOpportunity,
    approveOpportunity,
    rejectOpportunity,
    convertOpportunity,
    removeOpportunity,
    oppPagination,
  } = usePartners({
    oppStatus: filterStatus !== 'all' ? filterStatus : undefined,
    oppPartnerUid: filterPartner !== 'all' ? filterPartner : undefined,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selectedOpp, setSelectedOpp] = useState<PartnerOpportunity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerOpportunity | null>(null);

  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('client_name', {
        header: 'Oportunidad',
        cell: (info) => (
          <div>
            <p className="text-subtitle2 font-medium text-foreground">{info.getValue()}</p>
            <p className="text-caption text-muted-foreground line-clamp-1">
              {info.row.original.product}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor('partner_name', {
        header: 'Partner',
        cell: (info) => <span className="text-body2">{info.getValue()}</span>,
      }),
      columnHelper.accessor('estimated_value', {
        header: () => <div className="text-right w-full">Valor est.</div>,
        cell: (info) => (
          <div className="text-right">
            <span className="text-body2 font-medium">
              {info.row.original.currency}{' '}
              {info.getValue().toLocaleString('es', { minimumFractionDigits: 0 })}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('registered_date', {
        header: 'Registrada',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('assigned_to_internal', {
        header: 'Asignado a',
        cell: (info) => (
          <span className="text-body2 text-muted-foreground">{info.getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const cfg = PARTNER_OPP_STATUS_CONFIG[info.getValue() as PartnerOpportunityStatus] ?? {
            label: info.getValue(),
            color: 'default' as const,
          };
          return (
            <Badge variant="soft" color={cfg.color}>
              {cfg.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: (info) => {
          const { status, partner_name } = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    color="success"
                    variant="soft"
                    className="h-6 text-[11px] px-2"
                    onClick={async () => {
                      const ok = await approveOpportunity(info.row.original.uid);
                      if (ok) {
                        notify.success(
                          `Oportunidad aprobada. ${partner_name} tiene exclusividad sobre este cliente.`
                        );
                      } else {
                        notify.error('Error al aprobar la oportunidad');
                      }
                    }}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    color="error"
                    variant="soft"
                    className="h-6 text-[11px] px-2"
                    onClick={async () => {
                      const ok = await rejectOpportunity(info.row.original.uid);
                      if (ok) {
                        notify.success('Oportunidad rechazada.');
                      } else {
                        notify.error('Error al rechazar la oportunidad');
                      }
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    color="info"
                    variant="soft"
                    className="h-6 text-[11px] px-2"
                    onClick={async () => {
                      try {
                        await convertOpportunity(info.row.original.uid);
                        notify.success('Oportunidad convertida a deal.');
                      } catch {
                        // error handled by mutation onError
                      }
                    }}
                  >
                    Convertir a Deal
                  </Button>
                </>
              )}
              <EditButton
                onClick={() => {
                  setSelectedOpp(info.row.original);
                  setDrawerMode('edit');
                  setDrawerOpen(true);
                }}
              />
              <DeleteButton onClick={() => setDeleteTarget(info.row.original)} />
            </div>
          );
        },
      }),
    ],
    [approveOpportunity, rejectOpportunity, convertOpportunity]
  );

  const { table, dense, onChangeDense } = useTable({
    data: opportunities,
    columns: COLUMNS,
    total: oppPagination.total,
    pageIndex: oppPagination.page - 1,
    pageSize: oppPagination.rowsPerPage,
    onPageChange: (pi: number) => oppPagination.onChangePage(pi + 1),
    onPageSizeChange: oppPagination.onChangeRowsPerPage,
  });

  const statsCards = [
    {
      title: 'Pendientes de revisión',
      value: opportunityStats.pending,
      trend: 'esperan aprobación',
      trendUp: false,
      icon: <Icon name="Clock" size={18} />,
      iconClassName: 'bg-warning/10 text-warning',
    },
    {
      title: 'Validadas',
      value: opportunityStats.validated,
      trend: 'con exclusividad',
      trendUp: true,
      icon: <Icon name="CheckCircle" size={18} />,
      iconClassName: 'bg-success/10 text-success',
    },
    {
      title: 'Cerradas',
      value: opportunityStats.closed,
      trend: 'no habilitadas',
      trendUp: false,
      icon: <Icon name="XCircle" size={18} />,
      iconClassName: 'bg-error/10 text-error',
    },
    {
      title: 'Ganadas',
      value: opportunityStats.won,
      trend: 'en seguimiento',
      trendUp: true,
      icon: <Icon name="ArrowRight" size={18} />,
      iconClassName: 'bg-info/10 text-info',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Registro de Oportunidades"
        subtitle="Deal registration — evitá conflictos de canal entre partners"
        action={
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              setSelectedOpp(null);
              setDrawerMode('create');
              setDrawerOpen(true);
            }}
          >
            <Icon name="Plus" size={16} />
            Registrar oportunidad
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

      {/* Banner pendientes */}
      {opportunityStats.pending > 0 && filterStatus !== 'pending' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Icon name="AlertCircle" size={16} className="text-warning shrink-0" />
            <p className="text-caption text-warning font-medium">
              <span className="font-bold">{opportunityStats.pending}</span> oportunidad(es)
              pendientes de revisión
            </p>
          </div>
          <button
            onClick={() => setFilterStatus('pending')}
            className="text-caption text-warning font-semibold hover:underline whitespace-nowrap shrink-0"
          >
            Ver pendientes
          </button>
        </div>
      )}

      {/* Table */}
      <SectionCard noPadding>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por partner, cliente o producto..."
              value={oppPagination.search ?? ''}
              onChange={(e) => oppPagination.onChangeSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>

          <SelectField
            label="Estado"
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...Object.entries(PARTNER_OPP_STATUS_CONFIG).map(([key, cfg]) => ({
                value: key,
                label: cfg.label,
              })),
            ]}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string)}
          />

          <SelectField
            label="Partner"
            options={[
              { value: 'all', label: 'Todos los partners' },
              ...partners.map((p) => ({ value: p.uid, label: p.name })),
            ]}
            value={filterPartner}
            onChange={(v) => setFilterPartner(v as string)}
          />
        </div>

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
          <TablePaginationCustom table={table} dense={dense} onChangeDense={onChangeDense} />
        </div>
      </SectionCard>

      <PartnerOpportunityDrawer
        open={drawerOpen}
        mode={drawerMode}
        opportunity={selectedOpp}
        partners={partners}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOpp(null);
        }}
        onCreate={createOpportunity}
        onUpdate={updateOpportunity}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await removeOpportunity(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar oportunidad?"
        description={
          <>
            Vas a eliminar la oportunidad de <strong>{deleteTarget?.client_name}</strong> con{' '}
            <strong>{deleteTarget?.partner_name}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
