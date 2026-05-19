'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import type ApexCharts from 'apexcharts';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { TenantDetailDrawer } from 'src/features/admin/components/tenant-detail-drawer';
import { TenantStatusBadge } from 'src/features/admin/components/tenant-status-badge';
import { useDashboard } from 'src/features/admin/hooks/use-dashboard';
import { useTenants } from 'src/features/admin/hooks/use-tenants';
import { Tenant } from 'src/features/admin/types/admin.types';
import { formatCompact, formatMoney } from 'src/lib/currency';
import { formatRelative } from 'src/lib/date';
import { notify } from 'src/lib/notify';
import { Chart } from 'src/shared/components/chart';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  SectionCardHeader,
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
  TableSkeleton,
  useTable,
} from 'src/shared/components/table';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { SelectField } from 'src/shared/components/ui/select-field';

function getInitials(nombre: string) {
  return (nombre ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const columnHelper = createColumnHelper<Tenant>();

import { DashboardPeriod } from 'src/features/admin/services/dashboard.service';

const PERIOD_OPTIONS = [
  { value: '', label: 'Global (sin filtro)' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '12m', label: 'Últimos 12 meses' },
];

export const DashboardAdminView = () => {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod | undefined>(undefined);
  const { data, isLoading, refetch } = useDashboard(period);
  const { createTenantUser } = useTenants();
  const [isRefetching, setIsRefetching] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleVerDetalle = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailOpen(true);
  };

  const COLUMNS = useMemo(
    () => [
      columnHelper.accessor('nombre', {
        header: 'Cliente',
        cell: (info) => {
          const t = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-semibold">
                  {getInitials(t.nombre)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground text-sm">{t.nombre}</p>
                <p className="text-xs text-muted-foreground">{t.dominio}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('plan_nombre', {
        header: 'Plan',
        cell: (info) => (
          <Badge variant="outline" className="text-xs">
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('total_usuarios', {
        header: 'Usuarios',
        cell: (info) => {
          const t = info.row.original;
          return (
            <p className="text-sm text-foreground">
              {t.total_usuarios} / {t.limite_usuarios}
            </p>
          );
        },
      }),
      columnHelper.accessor('mrr', {
        header: 'MRR',
        cell: (info) => (
          <span className="font-medium text-foreground">
            {formatMoney(info.getValue(), { scope: 'platform', maximumFractionDigits: 0 })}
          </span>
        ),
      }),
      columnHelper.accessor('estado', {
        header: 'Estado',
        cell: (info) => <TenantStatusBadge estado={info.getValue()} />,
      }),
      columnHelper.accessor('last_access_at', {
        header: 'Último acceso',
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatRelative(info.getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'acciones',
        header: '',
        cell: (info) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleVerDetalle(info.row.original);
              }}
            >
              Ver detalle
            </Button>
          </div>
        ),
      }),
    ],
    []
  );

  const { table, dense, onChangeDense } = useTable({
    data: data?.tenants_recientes ?? [],
    columns: COLUMNS,
    defaultRowsPerPage: 10,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard Global"
          subtitle="Vista general del sistema y estado de todos los clientes"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <div className="lg:col-span-7 h-80 bg-muted/40 rounded-xl animate-pulse" />
          <div className="lg:col-span-5 h-80 bg-muted/40 rounded-xl animate-pulse" />
        </div>
        <SectionCard noPadding className="mt-6">
          <div className="p-5">
            <h2 className="text-h6 text-foreground">Clientes Recientes</h2>
          </div>
          <TableContainer>
            <Table>
              <thead>
                <tr className="border-b border-border/50">
                  {['Cliente', 'Plan', 'Usuarios', 'MRR', 'Estado', 'Último acceso', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <TableBody>
                <TableSkeleton rows={10} columns={7} />
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </PageContainer>
    );
  }

  if (!data) return null; // guard against undefined before data arrives

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, parentHeightOffset: 0 },
    colors: ['#3B82F6'],
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: data.mrr_history.map((h) => h.mes),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (value: number) =>
          formatCompact(value, { scope: 'platform', currencyDisplay: 'codeAndSymbol' }),
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) =>
          formatMoney(value, { scope: 'platform', maximumFractionDigits: 0 }),
      },
    },
    noData: { text: 'Pendiente: GET /admin/dashboard con mrr_history[]' },
  };

  const chartSeries = [{ name: 'MRR', data: data.mrr_history.map((h) => h.valor) }];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Global"
        subtitle="Vista general del sistema y estado de todos los tenants"
        action={
          <div className="flex items-center gap-3">
            <SelectField
              options={PERIOD_OPTIONS}
              value={period ?? ''}
              onChange={(v) => setPeriod((v as DashboardPeriod) || undefined)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isRefetching}
              onClick={async () => {
                setIsRefetching(true);
                await refetch();
                setIsRefetching(false);
                notify.success('Dashboard actualizado');
              }}
              className="gap-2"
            >
              <Icon name="RefreshCw" className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Clientes Activos"
          value={data.tenants_activos}
          trend={`${data.tenants_trial} en trial`}
          icon={<Icon name="Building2" className="h-5 w-5" />}
          iconClassName="bg-blue-500/10 text-blue-600"
        />
        <StatsCard
          title="MRR Total"
          value={formatCompact(data.mrr_total, {
            scope: 'platform',
            currencyDisplay: 'codeAndSymbol',
          })}
          trend={
            data.mrr_growth_percent !== 0
              ? `${data.mrr_growth_percent > 0 ? '+' : ''}${data.mrr_growth_percent}% vs mes anterior`
              : 'Sin datos de crecimiento'
          }
          trendUp={data.mrr_growth_percent >= 0}
          icon={<Icon name="TrendingUp" className="h-5 w-5" />}
          iconClassName="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard
          title="Facturas Vencidas"
          value={data.facturas_vencidas !== 0 ? data.facturas_vencidas : '—'}
          trend={data.facturas_vencidas !== 0 ? 'requieren atención' : 'Todo al día'}
          trendUp={data.facturas_vencidas === 0}
          icon={<Icon name="AlertCircle" className="h-5 w-5" />}
          iconClassName="bg-amber-500/10 text-amber-600"
        />
        <StatsCard
          title="Errores Críticos (24h)"
          value={data.errores_criticos_24h !== 0 ? data.errores_criticos_24h : '—'}
          trend={data.errores_criticos_24h !== 0 ? 'en las últimas 24h' : 'Sin errores recientes'}
          trendUp={data.errores_criticos_24h === 0}
          icon={<Icon name="Activity" className="h-5 w-5" />}
          iconClassName="bg-red-500/10 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <SectionCard>
            <SectionCardHeader title="Evolución del MRR" subtitle="Últimos 6 meses" />
            <Chart type="area" series={chartSeries} options={chartOptions} height={280} />
          </SectionCard>
        </div>

        <div className="lg:col-span-5 flex flex-col h-full">
          <SectionCard className="flex-1 flex flex-col">
            <SectionCardHeader
              title="Requieren Atención"
              action={
                <Badge variant="soft" className="ml-2 bg-red-100 text-red-700 border-transparent">
                  {data.tenants_en_riesgo.length}
                </Badge>
              }
            />
            <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-3">
              {data.tenants_en_riesgo.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                  <Icon
                    name="CheckCircle2"
                    className="h-10 w-10 text-emerald-500 mb-3 opacity-80"
                  />
                  <p className="text-body2 font-medium">Todo en orden</p>
                  <p className="text-caption mt-1">No hay clientes en riesgo actualmente.</p>
                </div>
              ) : (
                data.tenants_en_riesgo.map((tenant) => (
                  <div
                    key={tenant.uid}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback
                          className={
                            tenant.estado === 'SUSPENDIDO'
                              ? 'bg-red-100 text-red-700 font-bold'
                              : 'bg-amber-100 text-amber-700 font-bold'
                          }
                        >
                          {getInitials(tenant.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{tenant.nombre}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <TenantStatusBadge estado={tenant.estado} />
                          <span className="text-xs text-muted-foreground">
                            {tenant.plan_nombre}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0 text-blue-600"
                      onClick={() => handleVerDetalle(tenant)}
                    >
                      Ver cliente &rarr;
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard noPadding>
        <div className="p-5 flex justify-between items-center">
          <h2 className="text-h6 text-foreground">Tenants Recientes</h2>
          <Button
            variant="link"
            size="sm"
            className="text-sm font-medium pr-0"
            onClick={() => router.push('/admin/tenants')}
          >
            Ver todos los clientes &rarr;
          </Button>
        </div>

        <TableContainer>
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} onClick={() => handleVerDetalle(row.original)}>
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

      <TenantDetailDrawer
        tenant={selectedTenant}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onCreateUser={createTenantUser}
      />
    </PageContainer>
  );
};
