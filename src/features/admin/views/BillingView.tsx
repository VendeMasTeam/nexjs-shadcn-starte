'use client';

import React, { useState } from 'react';
import { BillingDetailDrawer } from 'src/features/admin/components/billing-detail-drawer';
import { BillingTable } from 'src/features/admin/components/billing-table';
import { useBilling } from 'src/features/admin/hooks/use-billing';
import { usePlansAdmin } from 'src/features/admin/hooks/use-plans-admin';
import { billingService } from 'src/features/admin/services/billing.service';
import { BillingExportFilters, EstadoFactura, Factura } from 'src/features/admin/types/admin.types';
import { formatMoney } from 'src/lib/currency';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatsCard,
} from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useDebounce } from 'use-debounce';

function getPeriodDates(period: string): { from?: string; to?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'este_mes') {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
  }
  if (period === 'mes_anterior') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmt(first), to: fmt(last) };
  }
  if (period === 'ultimos_3m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return { from: fmt(from), to: fmt(now) };
  }
  if (period === 'este_año') {
    return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
  }
  return {};
}

export const BillingView = () => {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  const [debouncedSearch] = useDebounce(search, 400);
  const { from, to } = getPeriodDates(filterPeriodo);
  const { planes } = usePlansAdmin();

  const { facturas, summary, isLoading, marcarPagadas, pagination } = useBilling({
    estado: (filterEstado as EstadoFactura) || undefined,
    from,
    to,
    search: debouncedSearch || undefined,
    plan_uid: filterPlan || undefined,
  });

  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleOpenDetail = (factura: Factura) => {
    setSelectedFactura(factura);
    setIsDetailOpen(true);
  };

  const activeFiltersCount =
    (filterEstado ? 1 : 0) + (filterPeriodo ? 1 : 0) + (search ? 1 : 0) + (filterPlan ? 1 : 0);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const format = 'csv';
      const blob = await billingService.exportReport({
        estado: (filterEstado as BillingExportFilters['estado']) || undefined,
        from,
        to,
        search: debouncedSearch || undefined,
        plan_uid: filterPlan || undefined,
        format,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterEstado('');
    setFilterPeriodo('');
    setFilterPlan('');
  };

  const planOptions = [
    { value: '', label: 'Todos los planes' },
    ...planes.map((p) => ({ value: p.uid, label: p.name })),
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Facturación"
        subtitle="Historial de cobros y estado de pagos por cliente"
        action={
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting}>
            <Icon
              name={isExporting ? 'Loader2' : 'Download'}
              className={`h-4 w-4${isExporting ? ' animate-spin' : ''}`}
            />
            {isExporting ? 'Exportando...' : 'Generar Reporte'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading && !summary ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          ))
        ) : (
          <>
            <StatsCard
              title="Cobrado este mes"
              value={formatMoney(summary?.cobrado_este_mes ?? 0, {
                scope: 'platform',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              trend={`${summary?.pagadas ?? 0} facturas pagadas`}
              icon={<Icon name="DollarSign" className="h-5 w-5" />}
              iconClassName="bg-emerald-500/10 text-emerald-600"
            />
            <StatsCard
              title="Pendiente de cobro"
              value={formatMoney(summary?.pendiente_cobro ?? 0, {
                scope: 'platform',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              trend={`${summary?.pendientes ?? 0} facturas`}
              trendUp={false}
              icon={<Icon name="Clock" className="h-5 w-5" />}
              iconClassName="bg-amber-500/10 text-amber-600"
            />
            <StatsCard
              title="Facturas vencidas"
              value={formatMoney(summary?.facturas_vencidas ?? 0, {
                scope: 'platform',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              trend={`${summary?.vencidas ?? 0} vencidas`}
              trendUp={false}
              icon={<Icon name="AlertTriangle" className="h-5 w-5" />}
              iconClassName="bg-red-500/10 text-red-600"
            />
          </>
        )}
      </div>

      <SectionCard noPadding className="flex flex-col shadow-sm border border-border/40">
        <div className="flex flex-col sm:flex-row gap-4 items-end px-5 py-4">
          <Input
            label="Buscar cliente"
            placeholder="Nombre, dominio o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" className="h-4 w-4" />}
            className="flex-1 w-full max-w-sm"
          />

          <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
            <SelectField
              label="Plan"
              options={planOptions}
              value={filterPlan}
              onChange={(v) => setFilterPlan(v as string)}
            />
            <SelectField
              label="Período"
              options={[
                { value: '', label: 'Todos los períodos' },
                { value: 'este_mes', label: 'Este mes' },
                { value: 'mes_anterior', label: 'Mes anterior' },
                { value: 'ultimos_3m', label: 'Últimos 3 meses' },
                { value: 'este_año', label: 'Este año' },
              ]}
              value={filterPeriodo}
              onChange={(v) => setFilterPeriodo(v as string)}
            />
            <SelectField
              label="Estado"
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'PAGADA', label: 'Pagada' },
                { value: 'PENDIENTE', label: 'Pendiente' },
                { value: 'VENCIDA', label: 'Vencida' },
                { value: 'CANCELADA', label: 'Cancelada' },
              ]}
              value={filterEstado}
              onChange={(v) => setFilterEstado(v as string)}
            />

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground h-10 px-3"
              >
                <Icon name="Filter" className="h-4 w-4 mr-2" />
                Limpiar <span className="ml-1 opacity-70">({activeFiltersCount})</span>
              </Button>
            )}
          </div>
        </div>
        <BillingTable
          facturas={facturas}
          isLoading={isLoading}
          onViewDetail={handleOpenDetail}
          onMarcarPagadas={async (ids) => {
            await marcarPagadas(ids);
          }}
          total={pagination.total}
          pageIndex={pagination.page - 1}
          pageSize={pagination.rowsPerPage}
          onPageChange={(pi) => pagination.onChangePage(pi + 1)}
          onPageSizeChange={pagination.onChangeRowsPerPage}
        />
      </SectionCard>

      <BillingDetailDrawer
        factura={selectedFactura}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onMarcarPagada={async (id) => {
          await marcarPagadas([id]);
          setIsDetailOpen(false);
        }}
      />
    </PageContainer>
  );
};
