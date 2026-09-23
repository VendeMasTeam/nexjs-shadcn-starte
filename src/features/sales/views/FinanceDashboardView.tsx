'use client';

import { createColumnHelper, flexRender } from '@tanstack/react-table';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMoney } from 'src/lib/currency';
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
  TableHeadCustom,
  TableRow,
  useTable,
} from 'src/shared/components/table';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';

import { SalesPageSkeleton } from '../components/SalesPageSkeleton';
import { useFinanceDashboard } from '../hooks/useFinanceDashboard';
import type { FinanceDashboardInvoice } from '../types/sales.types';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Config ───────────────────────────────────────────────────────────────────

const DATE_FILTERS = ['Esta semana', 'Este mes', 'Último trimestre'];

type StatusKey = 'issued' | 'partial' | 'paid' | 'overdue' | 'draft';

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; color: 'success' | 'warning' | 'error' | 'primary' | 'secondary' }
> = {
  paid: { label: 'Pagada', color: 'success' },
  issued: { label: 'Emitida', color: 'warning' },
  partial: { label: 'Parcial', color: 'primary' },
  overdue: { label: 'Vencida', color: 'error' },
  draft: { label: 'Borrador', color: 'secondary' },
};

const columnHelper = createColumnHelper<FinanceDashboardInvoice>();

// ─── View ─────────────────────────────────────────────────────────────────────

export function FinanceDashboardView() {
  const router = useRouter();
  const { dashboard, isLoading } = useFinanceDashboard();
  const [activeDateFilter, setActiveDateFilter] = useState('Este mes');

  const { weekly_sales = [], recent_invoices = [] } = dashboard ?? {};

  const chartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'inherit',
      },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      colors: ['#2563EB'],
      xaxis: {
        categories: weekly_sales.map((_, i) => `Sem ${i + 1}`),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#94a3b8', fontSize: '12px' } },
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8', fontSize: '12px' },
          formatter: (val: number) => `${(val / 1000).toFixed(0)}K`,
        },
      },
      grid: { borderColor: 'rgba(148,163,184,0.1)', strokeDashArray: 4 },
      tooltip: {
        y: { formatter: (val: number) => formatMoney(val, { maximumFractionDigits: 0 }) },
      },
      theme: { mode: 'dark' },
    }),
    [weekly_sales]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('invoice_number', {
        header: 'N° Factura',
        cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('client_name', {
        header: 'Cliente',
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('issued_at', {
        header: 'Fecha',
        cell: (info) => (
          <span className="text-muted-foreground">
            {new Date(info.getValue()).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      }),
      columnHelper.accessor('amount', {
        header: () => <div className="text-right w-full">Monto</div>,
        cell: (info) => (
          <div className="text-right font-semibold text-foreground">
            {formatMoney(info.getValue(), { maximumFractionDigits: 0 })}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const cfg = STATUS_CONFIG[info.getValue()] ?? STATUS_CONFIG.issued;
          return (
            <Badge variant="soft" color={cfg.color}>
              {cfg.label}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-center w-full">Acciones</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(paths.sales.invoice(row.original.uid))}
            >
              Ver
            </Button>
          </div>
        ),
      }),
    ],
    [router]
  );

  // Sin paginación: `recent_invoices` es un preview fijo embebido en el dashboard
  // (una sola llamada a GET /finance/dashboard), no un listado paginable. El 100
  // es solo para que nunca corte la lista — el tamaño real lo limita el backend.
  const { table, dense } = useTable({
    data: recent_invoices,
    columns,
    defaultRowsPerPage: 100,
  });

  if (isLoading)
    return (
      <SalesPageSkeleton
        title="Dashboard Financiero"
        subtitle="Resumen de ventas, facturas y cartera de este período"
        statsCount={4}
      />
    );

  if (!dashboard) return null; // guard against undefined before data arrives

  const { stats } = dashboard;

  return (
    <PageContainer className="pb-10">
      <PageHeader
        title="Dashboard Financiero"
        subtitle="Resumen de ventas, facturas y cartera de este período"
      />

      <div className="flex items-center gap-2">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveDateFilter(filter)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeDateFilter === filter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatsCard
          title="Ventas del Mes"
          value={formatMoney(stats.monthly_sales, { maximumFractionDigits: 0 })}
          trend={`${stats.monthly_sales_growth_percent > 0 ? '+' : ''}${stats.monthly_sales_growth_percent}% vs mes anterior`}
          trendUp={stats.monthly_sales_growth_percent >= 0}
          icon={<Icon name="TrendingUp" size={20} />}
          iconClassName="bg-emerald-500/10 text-emerald-500"
        />
        <StatsCard
          title="Facturas Pendientes"
          value={`${stats.pending_invoices_count} facturas`}
          trend={`${formatMoney(stats.pending_invoices_amount, { maximumFractionDigits: 0 })} pendiente`}
          trendUp={false}
          icon={<Icon name="Clock" size={20} />}
          iconClassName="bg-amber-500/10 text-amber-500"
        />
        <StatsCard
          title="Cartera Vencida"
          value={formatMoney(stats.overdue_portfolio, { maximumFractionDigits: 0 })}
          trend={`${stats.overdue_clients_count} clientes en mora`}
          trendUp={false}
          icon={<Icon name="AlertCircle" size={20} />}
          iconClassName="bg-red-500/10 text-red-500"
        />
        <StatsCard
          title="Margen Promedio"
          value={`${stats.average_margin_percent.toFixed(1)}%`}
          trend={`Meta: ${stats.margin_target_percent}%`}
          trendUp={stats.average_margin_percent >= stats.margin_target_percent}
          icon={<Icon name="BarChart2" size={20} />}
          iconClassName="bg-indigo-500/10 text-indigo-500"
        />
      </div>

      {weekly_sales.length > 0 && (
        <SectionCard>
          <h2 className="text-h6 text-foreground mb-1">Ventas por semana</h2>
          <p className="text-body2 text-muted-foreground mb-5">
            Últimas {weekly_sales.length} semanas
          </p>
          <ReactApexChart
            options={chartOptions}
            series={[{ name: 'Ventas', data: weekly_sales }]}
            type="bar"
            height={280}
          />
        </SectionCard>
      )}

      <SectionCard noPadding>
        <div className="px-6 py-4">
          <h2 className="text-h6 text-foreground">Últimas Facturas</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeadCustom table={table} />
            <TableBody dense={dense}>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    Sin facturas recientes
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
        </div>
      </SectionCard>
    </PageContainer>
  );
}
