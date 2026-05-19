'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { createColumnHelper, flexRender } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { localizationService } from 'src/features/settings/services/localization.service';
import { formatMoney, getCurrencyPreferences, setCurrencyPreferences } from 'src/lib/currency';
import { notify } from 'src/lib/notify';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCustom,
  TablePaginationCustom,
  TableRow,
  useTable,
} from 'src/shared/components/table';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { SelectField } from 'src/shared/components/ui/select-field';

import { SalesPageSkeleton } from '../components/SalesPageSkeleton';
import { useCurrencyRates } from '../hooks/useCurrencyRates';
import type { CurrencyRate } from '../types/sales.types';

const columnHelper = createColumnHelper<CurrencyRate>();

// ─── View ─────────────────────────────────────────────────────────────────────

export function MultiCurrencyView() {
  const { rates, setRates, saveRate, isSaving, isLoading, pagination } = useCurrencyRates();
  const [baseCurrency, setBaseCurrency] = useState(() => getCurrencyPreferences('tenant').currency);

  const { data: currencyOptions = [] } = useQuery({
    queryKey: ['settings', 'localization', 'options', 'currencies'],
    queryFn: async () => {
      const res = (await localizationService.getOptions()) as Record<string, unknown>;
      const data = (res?.data ?? res) as {
        currencies?: Array<{ code: string; label: string; symbol: string }>;
      };
      return (data.currencies ?? []).map((c) => ({
        value: c.code,
        label: c.label ? `${c.code} — ${c.label}` : c.code,
      }));
    },
    staleTime: 0,
  });

  const updateRate = useCallback(
    (code: string, value: string) => {
      const updated = rates.map((r) =>
        r.code === code ? { ...r, rate: parseFloat(value) || r.rate } : r
      );
      setRates(updated);
    },
    [rates, setRates]
  );

  // Save base currency preference
  const { mutate: guardarMonedaBase } = useMutation({
    mutationFn: (currency: string) => localizationService.update({ currency }),
    onSuccess: (_, currency) => {
      setCurrencyPreferences({ currency }, 'tenant');
      notify.success('Moneda base actualizada');
    },
    onError: () => notify.error('Error al guardar la moneda base'),
  });

  const hasOutdated = rates.some((r) => r.status === 'outdated');

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'currency',
        header: 'Moneda',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant="soft"
                className="text-xs font-bold bg-primary/10 text-primary rounded border-none px-2 py-0.5"
              >
                {row.code}
              </Badge>
              <span className="text-foreground">{row.name || row.code}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('rate', {
        header: () => <div className="text-center w-full">Tipo de Cambio</div>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>1 USD =</span>
              <input
                type="number"
                value={row.rate}
                step="0.01"
                onChange={(e) => updateRate(row.code, e.target.value)}
                className="w-28 text-center bg-muted/20 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-text"
              />
              <span>{row.code}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor('last_update', {
        header: () => <div className="text-center w-full">Última Actualización</div>,
        cell: (info) => <div className="text-center text-muted-foreground">{info.getValue()}</div>,
      }),
      columnHelper.accessor('status', {
        header: () => <div className="text-center w-full">Estado</div>,
        cell: (info) => (
          <div className="flex justify-center">
            {info.getValue() === 'active' ? (
              <Badge variant="soft" color="success">
                Activo
              </Badge>
            ) : (
              <Badge variant="soft" color="warning">
                Desactualizado
              </Badge>
            )}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <div className="text-center w-full">Acciones</div>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveRate(row.code, row.rate)}
                disabled={isSaving}
              >
                <Icon name="Save" size={13} />
                Guardar
              </Button>
            </div>
          );
        },
      }),
    ],
    [updateRate, saveRate, isSaving]
  );

  const { table, dense, onChangeDense } = useTable({
    data: rates,
    columns,
    defaultRowsPerPage: 10,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  if (isLoading)
    return (
      <SalesPageSkeleton
        title="Configuración Multimoneda"
        subtitle="Gestiona las monedas y tipos de cambio de tu sistema"
      />
    );

  return (
    <PageContainer className="pb-10">
      <PageHeader
        title="Configuración Multimoneda"
        subtitle="Gestiona las monedas y tipos de cambio de tu sistema"
      />

      <SectionCard className="p-6">
        <h2 className="text-h6 text-foreground mb-4">Moneda base del sistema</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <SelectField
              label="Moneda principal"
              options={currencyOptions}
              value={baseCurrency}
              onChange={(v) => setBaseCurrency(v as string)}
              searchable
            />
          </div>
          <Button
            color="primary"
            onClick={() => guardarMonedaBase(baseCurrency)}
            disabled={!baseCurrency}
          >
            Guardar configuración
          </Button>
        </div>
      </SectionCard>

      <SectionCard noPadding>
        <div className="px-6 py-4">
          <h2 className="text-h6 text-foreground">Tipo de cambio</h2>
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
                    Sin tipos de cambio configurados
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

        <div className="border-t border-border/40">
          <TablePaginationCustom
            table={table}
            dense={dense}
            onChangeDense={onChangeDense}
            total={pagination.total}
          />
        </div>
      </SectionCard>

      <div>
        <h2 className="text-h6 text-foreground mb-4">Visualización doble moneda</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SectionCard className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total cotización
              </p>
              <Badge variant="soft" color="secondary">
                Ejemplo
              </Badge>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatMoney(1000, {
                  currency: baseCurrency,
                  currencyDisplay: 'code',
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Moneda base</p>
            </div>
            <div className="pt-2 border-t border-border/40">
              <p className="text-lg font-semibold text-foreground">
                {formatMoney(4000000, {
                  currency: baseCurrency,
                  currencyDisplay: 'code',
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Equivalente</p>
            </div>
          </SectionCard>

          {hasOutdated && (
            <SectionCard className="border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 flex flex-col justify-between">
              <div className="flex gap-3">
                <Icon name="AlertTriangle" size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm">
                    Tipo de cambio desactualizado
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                    {rates
                      .filter((r) => r.status === 'outdated')
                      .map((r) => r.code)
                      .join(', ')}{' '}
                    tiene más de 24 horas sin actualizar.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/10"
                >
                  <Icon name="RefreshCw" size={14} />
                  Actualizar tipo de cambio
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
