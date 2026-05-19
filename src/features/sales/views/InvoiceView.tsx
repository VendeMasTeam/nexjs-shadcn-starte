'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Payment } from 'src/features/sales/types/sales.types';
import { endpoints } from 'src/lib/axios';
import { formatMoney } from 'src/lib/currency';
import { downloadExport } from 'src/lib/export-service';
import { paths } from 'src/routes/paths';
import { PageContainer, SectionCard } from 'src/shared/components/layouts/page';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';

import { RegisterPaymentDrawer } from '../components/RegisterPaymentDrawer';
import { useSalesContext } from '../context/SalesContext';
import { invoiceService } from '../services/invoice.service';
import { STATUS_LABELS } from '../types/sales.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'BORRADOR', className: 'bg-muted/10 text-muted-foreground' },
  issued: { label: 'EMITIDA', className: 'bg-amber-500/10 text-amber-600' },
  partial: { label: 'PARCIAL', className: 'bg-blue-500/10 text-blue-600' },
  paid: { label: 'PAGADA', className: 'bg-emerald-500/10 text-emerald-600' },
  overdue: { label: 'VENCIDA', className: 'bg-red-500/10 text-red-600' },
};

// ─── View ─────────────────────────────────────────────────────────────────────

interface InvoiceViewProps {
  invoiceId: string;
}

export function InvoiceView({ invoiceId }: InvoiceViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { quotations, registerPayment } = useSalesContext();
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch single invoice by ID — NOT from paginated list
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getOne(invoiceId),
    enabled: !!invoiceId,
    staleTime: 0,
  });

  // Resolve line items from source quotation
  const quotation = invoice ? quotations.find((q) => q.uid === invoice.quotation_uid) : undefined;
  const lineItems = quotation?.items ?? [];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <p>Cargando factura...</p>
        </div>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <Icon name="FileText" size={40} className="opacity-30" />
          <p className="text-lg font-medium">Factura no encontrada</p>
          <Button variant="outline" onClick={() => router.push(paths.sales.pipeline)}>
            Volver al Pipeline
          </Button>
        </div>
      </PageContainer>
    );
  }

  const pendingBalance = Math.max(0, invoice.outstanding_total);
  const paymentPercent = Math.min(100, Math.round((invoice.paid_total / invoice.total) * 100));
  const isPaid = invoice.status === 'paid';
  const statusConfig = STATUS_CONFIG[invoice.status] ?? {
    label: STATUS_LABELS[invoice.status] ?? invoice.status,
    className: 'bg-muted/10 text-muted-foreground',
  };

  const handleSendInvoice = async () => {
    setIsSending(true);
    try {
      await invoiceService.send(invoiceId);
      toast.success('Factura enviada al cliente');
    } catch {
      toast.error('Error al enviar la factura');
    } finally {
      setIsSending(false);
    }
  };

  const handleRegisterPayment = async (payment: Omit<Payment, 'uid'>) => {
    await registerPayment(invoiceId, payment);
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    setPaymentDrawerOpen(false);
  };

  // Line item totals
  const baseImponible = lineItems.reduce(
    (s, item) => s + item.list_unit_price * item.quantity * (1 - item.discount_percent / 100),
    0
  );

  return (
    <PageContainer fluid className="pb-10">
      {/* Paid banner */}
      {isPaid && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
          <Icon name="CheckCircle2" size={20} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Factura completamente pagada
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80">
              El pago se ha registrado correctamente.
            </p>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => router.push(paths.sales.pipeline)}
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Icon name="ArrowLeft" size={14} className="mr-0.5" />
          Inicio
        </button>
        <Icon name="ChevronRight" size={14} />
        <span>Facturación</span>
        <Icon name="ChevronRight" size={14} />
        <span className="text-foreground font-medium">{invoice.invoice_number}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] lg:items-start gap-6">
        {/* LEFT */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header Card */}
          <Card className="p-6 pb-6 shadow-sm overflow-hidden text-sm border-none shadow-card">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 flex items-center justify-center rounded-xl shrink-0">
                  <Icon name="FileText" size={24} />
                </div>
                <div>
                  <h1 className="text-h4 text-foreground leading-tight tracking-tight mb-0.5">
                    {invoice.invoice_number}
                  </h1>
                  <p className="text-muted-foreground text-sm">Factura de venta</p>
                </div>
              </div>
              <Badge
                variant="soft"
                className={`px-3 py-1.5 text-xs font-bold rounded-full border-none tracking-wider ${statusConfig.className}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 ${
                    invoice.status === 'issued' || invoice.status === 'overdue'
                      ? 'animate-[pulse_1.5s_ease-in-out_infinite]'
                      : ''
                  }`}
                />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="h-px bg-border/50 my-6" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Cotización origen
                </span>
                <span className="font-semibold text-foreground text-sm font-mono">
                  {invoice.quotation_uid}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Fecha de Emisión
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {formatDate(invoice.issued_at)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Vencimiento: {formatDate(invoice.due_date)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Moneda
                </span>
                <span className="font-semibold text-foreground text-sm">{invoice.currency}</span>
                {invoice.exchange_rate && (
                  <span className="text-xs text-muted-foreground">
                    Tasa: {invoice.exchange_rate}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Entidad
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {invoice.entity_label ?? invoice.invoiceable_type}
                </span>
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {invoice.entity_uid ?? invoice.invoiceable_uid}
                </span>
              </div>
            </div>
          </Card>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="border-none shadow-card gap-0 py-0">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Total Factura
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums break-all">
                      {formatMoney(invoice.total, {
                        scope: 'tenant',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500 shrink-0">
                    <Icon name="Receipt" size={18} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Subtotal:{' '}
                  {formatMoney(invoice.subtotal, {
                    scope: 'tenant',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-card gap-0 py-0">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Total Pagado
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums break-all">
                      {formatMoney(invoice.paid_total, {
                        scope: 'tenant',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Icon name="CheckCircle2" size={18} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>

            <Card
              className={`border-none shadow-card gap-0 py-0 ${
                pendingBalance > 0 ? 'bg-orange-50/50 dark:bg-orange-500/10' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-0.5">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        pendingBalance > 0 ? 'text-orange-600/70' : 'text-muted-foreground'
                      }`}
                    >
                      Saldo Pendiente
                    </p>
                    <p
                      className={`text-lg font-bold tabular-nums break-all ${
                        pendingBalance > 0 ? 'text-orange-600' : 'text-foreground'
                      }`}
                    >
                      {formatMoney(pendingBalance, {
                        scope: 'tenant',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600 shrink-0">
                    <Icon name="Clock" size={18} />
                  </div>
                </div>
                <p
                  className={`text-xs ${
                    pendingBalance > 0 ? 'text-orange-600/70' : 'text-muted-foreground'
                  }`}
                >
                  {pendingBalance > 0
                    ? `Vence: ${formatDate(invoice.due_date)}`
                    : 'Sin saldo pendiente'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment progress bar */}
          <div className="bg-card rounded-xl border border-border/50 p-6 shadow-sm">
            <div className="flex justify-between items-center text-sm font-semibold text-foreground mb-3">
              <span className="flex items-center gap-2">
                <Icon name="Landmark" size={16} className="text-muted-foreground" />
                Progreso de pago
              </span>
              <span>{paymentPercent}%</span>
            </div>
            <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${paymentPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
              <span>
                Pagado:{' '}
                {formatMoney(invoice.paid_total, {
                  scope: 'tenant',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span>
                Total:{' '}
                {formatMoney(invoice.total, {
                  scope: 'tenant',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Line items (from quotation) */}
          {lineItems.length > 0 && (
            <SectionCard noPadding className="border-none shadow-card">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Icon name="Box" size={20} className="text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">Productos Facturados</h2>
                </div>
                <Badge variant="soft" className="bg-muted text-muted-foreground rounded-full px-3">
                  {lineItems.length} líneas
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      {['Código', 'Descripción', 'Cant.', 'Precio Unit.', 'Dto.', 'Importe'].map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest ${
                              i > 1 ? 'text-right' : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => {
                      const lineTotal =
                        item.list_unit_price * item.quantity * (1 - item.discount_percent / 100);
                      return (
                        <tr
                          key={item.uid}
                          className={i < lineItems.length - 1 ? 'border-b border-border/40' : ''}
                        >
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono whitespace-nowrap bg-muted/20 text-muted-foreground border-border/50"
                            >
                              {item.sku || '-'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-foreground">{item.description}</p>
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {formatMoney(item.list_unit_price, {
                              scope: 'tenant',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground">
                            {item.discount_percent}%
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-foreground">
                            {formatMoney(lineTotal, {
                              scope: 'tenant',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-6 border-t border-border/40 bg-muted/10">
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between text-sm py-1.5 text-muted-foreground">
                    <span>Base Imponible:</span>
                    <span className="font-medium text-foreground">
                      {formatMoney(baseImponible, {
                        scope: 'tenant',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
                    <span className="text-base font-bold text-foreground">Total:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatMoney(invoice.total, {
                        scope: 'tenant',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* No line items fallback */}
          {lineItems.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Icon name="Box" size={32} className="opacity-30" />
              <p className="text-sm">Los productos aparecerán aquí desde la cotización asociada.</p>
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar */}
        <div className="space-y-6">
          {!isPaid && (
            <Button
              color="primary"
              className="w-full text-base py-6 shadow-md shadow-blue-500/20"
              onClick={() => setPaymentDrawerOpen(true)}
            >
              <Icon name="CheckCircle2" size={18} className="mr-2" /> Registrar Pago
            </Button>
          )}

          {/* Actions */}
          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Acciones
              </h3>
              <div className="space-y-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                  onClick={() =>
                    downloadExport({
                      endpoint: endpoints.invoicesExport,
                      format: 'pdf',
                      filters: { invoice_uid: 'current' },
                      filename: `factura.pdf`,
                    })
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                    <Icon name="Download" size={15} />
                  </div>
                  Descargar PDF
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
                  onClick={() =>
                    downloadExport({
                      endpoint: endpoints.invoicesExport,
                      format: 'excel',
                      filters: { invoice_uid: 'current' },
                      filename: `factura.xlsx`,
                    })
                  }
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Icon name="FileText" size={15} />
                  </div>
                  Exportar Excel
                </button>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-sm font-medium text-foreground disabled:opacity-50"
                  onClick={handleSendInvoice}
                  disabled={isSending}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Icon
                      name={isSending ? 'Loader2' : 'Mail'}
                      size={15}
                      className={isSending ? 'animate-spin' : ''}
                    />
                  </div>
                  {isSending ? 'Enviando...' : 'Enviar por Email'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Client card */}
          <Card className="border-none shadow-card bg-slate-900 text-slate-100 dark:bg-slate-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center shrink-0">
                  <Icon name="User" size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Cliente
                  </p>
                  <p className="font-semibold leading-tight truncate">
                    {invoice.client_name ?? invoice.entity_label ?? '—'}
                  </p>
                  {invoice.client_email && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{invoice.client_email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Total factura:</span>
                  <span className="font-medium text-white tabular-nums">
                    {formatMoney(invoice.total, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Saldo pendiente:</span>
                  <span className="font-medium text-orange-400 tabular-nums">
                    {formatMoney(pendingBalance, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Drawer */}
      <RegisterPaymentDrawer
        open={paymentDrawerOpen}
        onClose={() => setPaymentDrawerOpen(false)}
        pendingBalance={pendingBalance}
        onConfirm={handleRegisterPayment}
      />
    </PageContainer>
  );
}
