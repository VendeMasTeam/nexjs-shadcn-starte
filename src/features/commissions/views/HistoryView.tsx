'use client';

import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, flexRender } from '@tanstack/react-table';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'src/features/commissions/hooks/use-history';
import { commissionService } from 'src/features/commissions/services/commission.service';
import type { CommissionRun } from 'src/features/commissions/types/commissions.types';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { cn } from 'src/lib/utils';
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
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';

type RunRow = CommissionRun;
const columnHelper = createColumnHelper<RunRow>();

export const HistoryView = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    type: 'approve' | 'pay';
    uids: string[];
  } | null>(null);

  // States for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [periodoFilter, setPeriodoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const { runs, isLoading, bulkApprove, bulkPay, pagination } = useHistory({
    status: estadoFilter || undefined,
    search: searchTerm || undefined,
    period: periodoFilter || undefined,
  });

  // Fetch available periods from backend instead of hardcoded array
  const { data: availablePeriods = [] } = useQuery({
    queryKey: queryKeys.commissions.periods,
    queryFn: () => commissionService.getPeriods(),
    staleTime: 0,
  });

  const periodOptions = useMemo(
    () => [
      { value: '', label: 'Todos los periodos' },
      ...availablePeriods.map((p: string) => ({ value: p, label: p })),
    ],
    [availablePeriods]
  );

  // Mini-modal PDF
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfGenerando, setPdfGenerando] = useState(false);
  const [pdfPeriodo, setPdfPeriodo] = useState('febrero-2025');
  const [pdfOpciones, setPdfOpciones] = useState({
    detalleVentas: true,
    desgloseTramos: true,
    resumenEjecutivo: false,
  });

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === runs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(runs.map((r) => r.uid));
    }
  }, [selectedIds.length, runs]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleGenerarPDF = async () => {
    setPdfGenerando(true);
    try {
      const response = await axiosInstance.get(endpoints.commissions.historyPdf, {
        params: {
          period: pdfPeriodo,
          detalle_ventas: pdfOpciones.detalleVentas ? 1 : 0,
          desglose_tramos: pdfOpciones.desgloseTramos ? 1 : 0,
          resumen_ejecutivo: pdfOpciones.resumenEjecutivo ? 1 : 0,
        },
        responseType: 'blob',
      });

      const blob = response.data as Blob;

      // If backend returned JSON error instead of PDF binary
      if (blob.type.includes('json')) {
        const text = await blob.text();
        let message = 'Error al generar el PDF';
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          /* ignore parse error */
        }
        throw new Error(message);
      }

      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-comisiones-${pdfPeriodo}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      notify.success('Reporte PDF descargado');
      setPdfModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar el PDF';
      notify.error(message);
    } finally {
      setPdfGenerando(false);
    }
  };

  const periodosDisponibles = useMemo(() => {
    const unique = Array.from(new Set(runs.map((r) => r.period)))
      .sort()
      .reverse();
    return unique;
  }, [runs]);

  const allSelected = runs.length > 0 && selectedIds.length === runs.length;

  const COLUMNS = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            className="rounded border-input text-primary focus:ring-primary"
            onChange={handleSelectAll}
            checked={allSelected}
          />
        ),
        cell: (info) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="rounded border-input text-primary focus:ring-primary"
              checked={selectedIds.includes(info.row.original.uid)}
              onChange={() => toggleSelect(info.row.original.uid)}
            />
          </div>
        ),
      }),
      columnHelper.accessor('user_name', {
        header: 'Vendedor',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
              {info.getValue().charAt(0)}
            </div>
            <span className="font-medium text-foreground">{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('period', {
        header: 'Periodo',
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('total_sales', {
        header: 'Ventas',
        cell: (info) => (
          <span className="text-foreground">${info.getValue()?.toLocaleString() ?? '0'}</span>
        ),
      }),
      columnHelper.accessor('plan_applied', {
        header: 'Plan',
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor('calculated_commission', {
        header: 'Comisión',
        cell: (info) => (
          <div className="text-right font-bold text-foreground">
            ${info.getValue()?.toLocaleString() ?? '0'}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Estado',
        cell: (info) => {
          const st = info.getValue();
          if (st === 'PENDING')
            return (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">
                Pendiente
              </span>
            );
          if (st === 'APPROVED')
            return (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                Aprobado
              </span>
            );
          if (st === 'PAID')
            return (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                Pagado
              </span>
            );
          return null;
        },
      }),
      columnHelper.display({
        id: 'detalle',
        header: 'Detalle',
        cell: (info) => {
          const isExpanded = expandedId === info.row.original.uid;
          return (
            <div className="text-center w-full flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(info.row.original.uid);
                }}
                className="text-muted-foreground hover:text-blue-600 transition-colors p-1 rounded"
              >
                {isExpanded ? (
                  <Icon name="ChevronUp" size={16} />
                ) : (
                  <Icon name="ChevronDown" size={16} />
                )}
              </button>
            </div>
          );
        },
      }),
    ],
    [selectedIds, allSelected, expandedId, handleSelectAll]
  );

  const { table, dense, onChangeDense } = useTable({
    data: runs,
    columns: COLUMNS,
    defaultRowsPerPage: 10,
    total: pagination.total,
    pageIndex: pagination.page - 1,
    pageSize: pagination.rowsPerPage,
    onPageChange: (pi: number) => pagination.onChangePage(pi + 1),
    onPageSizeChange: pagination.onChangeRowsPerPage,
  });

  const pendientes = runs.filter((r) => r.status === 'PENDING');
  const sumaPendientes = pendientes.reduce((acc, r) => acc + r.calculated_commission, 0);
  const aprobados = runs.filter((r) => r.status === 'APPROVED');
  const sumaAprobados = aprobados.reduce((acc, r) => acc + r.calculated_commission, 0);
  const pagados = runs.filter((r) => r.status === 'PAID');
  const sumaPagados = pagados.reduce((acc, r) => acc + r.calculated_commission, 0);

  const seleccionPendientes = selectedIds.filter((id) => pendientes.find((r) => r.uid === id));
  const seleccionAprobados = selectedIds.filter((id) => aprobados.find((r) => r.uid === id));

  return (
    <PageContainer fluid className="pb-20 min-w-0 w-full space-y-6">
      <PageHeader
        title="Historial y Liquidación"
        subtitle="Revisa el historial de comisiones y gestiona el proceso de aprobación y pago"
        action={
          <Button
            onClick={() => setPdfModalOpen(true)}
            variant="outline"
            className="border-gray-300"
          >
            <Icon name="FileDown" className="mr-2 h-4 w-4" />
            Generar Reporte PDF
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectionCard className="flex justify-between items-center border-l-4 border-l-yellow-400">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Comisiones Pendientes</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">
              ${sumaPendientes.toLocaleString()}
            </p>
          </div>
          <div className="bg-yellow-50 text-yellow-600 px-3 py-1 text-sm rounded-full font-bold">
            {pendientes.length}
          </div>
        </SectionCard>
        <SectionCard className="flex justify-between items-center border-l-4 border-l-green-400">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Comisiones Aprobadas</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">
              ${sumaAprobados.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 text-green-600 px-3 py-1 text-sm rounded-full font-bold">
            {aprobados.length}
          </div>
        </SectionCard>
        <SectionCard className="flex justify-between items-center border-l-4 border-l-blue-400">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Comisiones Pagadas</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">${sumaPagados.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 text-blue-600 px-3 py-1 text-sm rounded-full font-bold">
            {pagados.length}
          </div>
        </SectionCard>
      </div>

      <SectionCard noPadding>
        {/* Filtros Integrados */}
        <div className="flex gap-4 flex-wrap items-end p-4 bg-muted/10">
          <div className="flex-1 min-w-[200px]">
            <Input
              label="Buscar"
              placeholder="Buscar vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Icon name="Search" size={16} />}
            />
          </div>
          <SelectField
            label="Periodo"
            value={periodoFilter}
            onChange={(val) => setPeriodoFilter(val as string)}
            options={periodOptions}
          />
          <SelectField
            label="Estado"
            value={estadoFilter}
            onChange={(val) => setEstadoFilter(val as string)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'PENDING', label: 'Pendiente' },
              { value: 'APPROVED', label: 'Aprobado' },
              { value: 'PAID', label: 'Pagado' },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchTerm('');
              setPeriodoFilter('');
              setEstadoFilter('');
            }}
          >
            Limpiar Filtros
          </Button>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="p-10 flex flex-col gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        ) : (
          <div className="w-full">
            <TableContainer>
              <Table>
                <TableHeadCustom table={table} />
                <TableBody dense={dense}>
                  {table.getRowModel().rows.map((row) => {
                    const isExpanded = expandedId === row.original.uid;

                    return (
                      <React.Fragment key={row.id}>
                        <TableRow
                          className={cn(
                            'transition-colors cursor-pointer',
                            isExpanded && 'bg-blue-50/30'
                          )}
                          onClick={() => toggleExpand(row.original.uid)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={!dense ? 'py-4' : undefined}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>

                        {/* Fila expandible */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell
                              colSpan={row.getVisibleCells().length}
                              className="bg-muted/10 p-0"
                            >
                              <div className="px-6 py-5 text-center text-muted-foreground text-sm">
                                Comisión total:{' '}
                                <span className="font-bold text-blue-600">
                                  ${row.original.calculated_commission?.toLocaleString() ?? '0'}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
          </div>
        )}
      </SectionCard>

      {/* Barra flotante selección */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 z-[50]">
          <span className="font-medium text-sm">
            {selectedIds.length}{' '}
            {selectedIds.length === 1 ? 'registro seleccionado' : 'registros seleccionados'}
          </span>
          <div className="flex gap-2 border-l border-gray-700 pl-6">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              disabled={seleccionPendientes.length === 0}
              onClick={() => setBulkConfirm({ type: 'approve', uids: seleccionPendientes })}
            >
              Aprobar ({seleccionPendientes.length})
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              disabled={seleccionAprobados.length === 0}
              onClick={() => setBulkConfirm({ type: 'pay', uids: seleccionAprobados })}
            >
              Marcar Pagados ({seleccionAprobados.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedIds([])}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => {
          if (bulkConfirm?.type === 'approve') bulkApprove(bulkConfirm.uids);
          else if (bulkConfirm?.type === 'pay') bulkPay(bulkConfirm.uids);
          setBulkConfirm(null);
          setSelectedIds([]);
        }}
        title={bulkConfirm?.type === 'approve' ? '¿Aprobar comisiones?' : '¿Marcar como pagadas?'}
        description={
          bulkConfirm?.type === 'approve'
            ? `Vas a aprobar ${bulkConfirm?.uids.length} registro(s). Esta acción no se puede deshacer.`
            : `Vas a marcar ${bulkConfirm?.uids.length} registro(s) como pagados. Esta acción no se puede deshacer.`
        }
        confirmLabel={bulkConfirm?.type === 'approve' ? 'Aprobar' : 'Marcar Pagados'}
        variant="warning"
      />

      {/* Drawer PDF */}
      <Sheet
        open={pdfModalOpen}
        onOpenChange={(v) => !v && !pdfGenerando && setPdfModalOpen(false)}
      >
        <SheetContent side="right" className="sm:max-w-[380px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-3">
              <Icon name="FileText" size={20} className="text-blue-600 shrink-0" />
              <div>
                <SheetTitle>Generar Reporte PDF</SheetTitle>
                <SheetDescription>Configura las opciones del reporte</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
            <div className="py-6 space-y-5">
              <SelectField
                value={pdfPeriodo}
                onChange={(val) => setPdfPeriodo(val as string)}
                label="Periodo"
                options={[
                  ...periodosDisponibles.map((p) => ({
                    value: p.toLowerCase().replace(/\s+/g, '-'),
                    label: p,
                  })),
                  { value: 'todos', label: 'Todos los periodos' },
                ]}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Incluir</p>
                {[
                  { key: 'detalleVentas', label: 'Detalle de ventas' },
                  { key: 'desgloseTramos', label: 'Desglose por tramos' },
                  { key: 'resumenEjecutivo', label: 'Resumen ejecutivo' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`pdf-${key}`}
                      checked={pdfOpciones[key as keyof typeof pdfOpciones]}
                      onCheckedChange={(v) =>
                        setPdfOpciones((prev) => ({ ...prev, [key]: v as boolean }))
                      }
                    />
                    <label
                      htmlFor={`pdf-${key}`}
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPdfModalOpen(false)}
              disabled={pdfGenerando}
            >
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleGenerarPDF}
              disabled={pdfGenerando}
            >
              {pdfGenerando ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generando...
                </span>
              ) : (
                'Generar PDF'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
};
