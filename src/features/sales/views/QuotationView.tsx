'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { catalogService } from 'src/features/sales/services/catalog.service';
import { quotationService } from 'src/features/sales/services/quotation.service';
import type { Quotation, QuotationItem } from 'src/features/sales/types/sales.types';
import { localizationService } from 'src/features/settings/services/localization.service';
import { formatMoney, getCurrencyPreferences } from 'src/lib/currency';
import { toDate } from 'src/lib/date';
import { paths } from 'src/routes/paths';
import { PageContainer } from 'src/shared/components/layouts/page';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';

import { OpportunityTimeline } from '../components/OpportunityTimeline';
import { useSalesContext } from '../context/SalesContext';
import { useQuotationById } from '../hooks/useQuotation';
import { STATUS_LABELS } from '../types/sales.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcLineTotal(item: QuotationItem): number {
  return item.list_unit_price * item.quantity * (1 - item.discount_percent / 100);
}

function calcTotals(items: QuotationItem[]) {
  const subtotal = items.reduce((s, p) => s + p.list_unit_price * p.quantity, 0);
  const discount = items.reduce(
    (s, p) => s + p.list_unit_price * p.quantity * (p.discount_percent / 100),
    0
  );
  const total = subtotal - discount;
  const units = items.reduce((s, p) => s + p.quantity, 0);
  return { subtotal, discount, total, units, productCount: items.length };
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-amber-500/10 text-amber-600',
  sent: 'bg-blue-500/10 text-blue-600',
  approved: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-red-500/10 text-red-600',
  cancelled: 'bg-purple-500/10 text-purple-600',
};

// ─── View ─────────────────────────────────────────────────────────────────────

interface QuotationViewProps {
  quotationId: string;
}

export function QuotationView({ quotationId }: QuotationViewProps) {
  const router = useRouter();
  const { saveQuotation, convertQuotationToInvoice, invoices, opportunities } = useSalesContext();

  // Track if a draft has been saved and redirected to a new URL
  const [savedDraft, setSavedDraft] = useState<Quotation | null>(null);

  // Use saved draft if URL matches the saved draft UID, otherwise fetch from API
  const { quotation: byIdQuotation } = useQuotationById(
    savedDraft?.uid === quotationId ? '' : quotationId
  );

  // Sync API result or saved draft into local state
  const [localQuotation, setLocalQuotation] = useState<Quotation | null>(() => {
    if (savedDraft?.uid === quotationId) return savedDraft;
    if (byIdQuotation) return byIdQuotation;
    const opp = opportunities.find((o) => o.uid === quotationId);
    return {
      uid: '',
      quote_number: '',
      title: opp?.title ?? '',
      status: 'draft',
      currency: '',
      subtotal: 0,
      discount_total: 0,
      total: 0,
      owner_user_uid: '',
      created_by_user_uid: '',
      items: [],
      entity_type: 'opportunity',
      entity_uid: quotationId,
      notes: '',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };
  });

  // When API returns quotation, update local state
  if (byIdQuotation && byIdQuotation.uid !== localQuotation?.uid && !savedDraft) {
    setLocalQuotation(byIdQuotation);
  }

  // Normalize API ISO date to YYYY-MM-DD for <input type="date">
  const toInputDate = (value: string | null | undefined): string => {
    if (!value) return '';
    return toDate(value).toISOString().split('T')[0];
  };

  const quotation = localQuotation;

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ['catalog', 'products'],
    queryFn: () => catalogService.getList({ status: 'active' }),
    staleTime: 0,
  });

  const { data: currencyOptions = [] } = useQuery({
    queryKey: ['settings', 'localization', 'options', 'currencies'],
    queryFn: async () => {
      const res = (await localizationService.getOptions()) as Record<string, unknown>;
      const data = (res?.data ?? res) as {
        currencies?: Array<{ code: string; label: string; symbol: string }>;
      };
      return (data.currencies ?? []).map((c) => ({
        value: c.code,
        label: `${c.code} - ${c.label}`,
      }));
    },
    staleTime: 0,
  });

  // Default currency from tenant preferences
  const defaultCurrency =
    getCurrencyPreferences('tenant').currency || (currencyOptions[0]?.value ?? '');

  // Sync default currency into local draft on mount
  useEffect(() => {
    if (quotation && !quotation.currency && defaultCurrency) {
      setLocalQuotation((prev) => (prev ? { ...prev, currency: defaultCurrency } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCurrency, quotation?.uid]); // only on mount / first render

  // Find linked opportunity for timeline
  const opp =
    opportunities.find((o) => o.uid === quotationId) ??
    (byIdQuotation ? opportunities.find((o) => o.uid === byIdQuotation.quoteable_uid) : undefined);

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // ── Items ────────────────────────────────────────────────────────────────────

  const addLine = useCallback(() => {
    setLocalQuotation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            uid: '',
            description: '',
            sku: '',
            quantity: 1,
            list_unit_price: 0,
            discount_percent: 0,
            net_unit_price: 0,
            line_total: 0,
            discount_total: 0,
          },
        ],
      };
    });
  }, []);

  const updateLine = useCallback((uid: string, field: keyof QuotationItem, rawValue: string) => {
    setLocalQuotation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.uid !== uid) return item;
          const numFields: (keyof QuotationItem)[] = [
            'quantity',
            'list_unit_price',
            'discount_percent',
          ];
          const value = numFields.includes(field) ? Number(rawValue) : rawValue;
          return { ...item, [field]: value };
        }),
      };
    });
  }, []);

  const removeLine = useCallback((uid: string) => {
    setLocalQuotation((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.uid !== uid),
      };
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!quotation) return;
    if (!quotation.title?.trim()) {
      toast.error('El título es requerido');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveQuotation(quotation);
      const savedQuotation = saved as Quotation;
      // Navigate to the new quotation UID so URL matches the saved quotation
      if (savedQuotation.uid && savedQuotation.uid !== quotationId) {
        router.replace(paths.sales.quotation(savedQuotation.uid));
      } else {
        // Refetch from API to maintain consistency
        const fresh = await quotationService.getOne(savedQuotation.uid);
        setLocalQuotation(fresh);
        setSavedDraft(fresh);
      }
      toast.success('Cotización guardada como borrador');
    } catch {
      toast.error('Error al guardar la cotización');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!quotation?.uid) return;
    setIsSending(true);
    try {
      await quotationService.sendPdf(quotation.uid);
      const updated = { ...quotation, status: 'sent' as const };
      setLocalQuotation(updated);
      saveQuotation(updated);
      toast.success('Cotización enviada al cliente');
    } catch {
      toast.error('Error al enviar la cotización');
    } finally {
      setIsSending(false);
    }
  };

  const handleReject = () => {
    if (!quotation) return;
    const updated = { ...quotation, status: 'rejected' as const };
    setLocalQuotation(updated);
    saveQuotation(updated);
    toast.info('Cotización marcada como rechazada');
  };

  const handleApprove = async () => {
    if (!quotation?.uid) return;
    setIsApproving(true);
    try {
      if (quotation.status === 'draft') {
        await saveQuotation(quotation);
      }
      const updated = await quotationService.update(quotation.uid, { status: 'approved' });
      setLocalQuotation(updated);
      saveQuotation(updated);
      toast.success('Cotización aprobada');
    } catch {
      toast.error('Error al aprobar la cotización');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quotation?.uid) return;
    try {
      const blob = await quotationService.getPdf(quotation.uid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quotation.quote_number ?? 'cotizacion'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar el PDF');
    }
  };

  const handleConvert = async () => {
    if (!quotation) return;
    setIsConverting(true);
    await new Promise((r) => setTimeout(r, 600));
    const invoice = await convertQuotationToInvoice(quotation.uid);
    saveQuotation({ ...quotation, status: 'cancelled' });
    if (invoice) {
      router.push(paths.sales.invoice(invoice.uid));
    }
  };

  // Find linked invoice from context's invoices array
  const invoice = quotation
    ? invoices.find((inv) => inv.quotation_uid === quotation.uid)
    : undefined;

  // ── Loading guard ────────────────────────────────────────────────────────────
  if (!quotation) {
    return (
      <PageContainer fluid className="pb-10">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando cotización…</p>
        </div>
      </PageContainer>
    );
  }

  const isDraft = quotation.status === 'draft';
  const isSent = quotation.status === 'sent';
  const isApproved = quotation.status === 'approved';
  const isCancelled = quotation.status === 'cancelled';
  const isRejected = quotation.status === 'rejected';
  const isEditable = isDraft;

  const totals = calcTotals(quotation.items);

  return (
    <PageContainer fluid className="pb-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push(paths.sales.pipeline)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <Icon name="ArrowLeft" size={15} />
            Volver al Pipeline
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-h4 text-foreground">{quotation.quote_number}</h1>
            <Badge
              variant="soft"
              className={`px-3 py-1 text-xs font-semibold rounded-full border-none ${
                STATUS_COLORS[quotation.status] ?? ''
              }`}
            >
              {STATUS_LABELS[quotation.status] ?? quotation.status}
            </Badge>
          </div>
          <p className="text-body2 text-muted-foreground mt-1">{quotation.title}</p>
          {opp?.title && (
            <p className="text-caption text-muted-foreground/70 mt-0.5">Cliente: {opp.title}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
          <Button
            variant="ghost"
            className="text-muted-foreground mr-1 hover:bg-muted/10 transition-colors"
            onClick={() => router.push(paths.sales.pipeline)}
          >
            Volver
          </Button>

          {/* PDF download — always available once saved */}
          {quotation.uid && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Icon name="Download" size={16} />
              Descargar PDF
            </Button>
          )}

          {/* Draft: save + send + approve directo (aprobación verbal) */}
          {isDraft && (
            <>
              <Button variant="outline" onClick={handleSave} loading={isSaving}>
                <Icon name="Save" size={16} />
                Guardar borrador
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-500 hover:bg-red-500/10"
                onClick={handleReject}
              >
                <Icon name="XCircle" size={16} />
                Rechazar
              </Button>
              <Button
                variant="outline"
                className="border-emerald-400 text-emerald-600 hover:bg-emerald-500/10"
                onClick={handleApprove}
                loading={isApproving}
                disabled={quotation.items.length === 0}
              >
                <Icon name="CheckCircle2" size={16} />
                Aprobar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={handleSend}
                loading={isSending}
                disabled={quotation.items.length === 0}
              >
                <Icon name="Send" size={16} />
                Enviar al cliente
              </Button>
            </>
          )}

          {/* Sent: esperando respuesta del cliente */}
          {isSent && (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-500 hover:bg-red-500/10"
                onClick={handleReject}
              >
                <Icon name="XCircle" size={16} />
                Rechazar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleApprove}
                loading={isApproving}
              >
                <Icon name="CheckCircle2" size={16} />
                Marcar como aprobada
              </Button>
            </>
          )}

          {/* Approved: convertir a factura */}
          {isApproved && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              onClick={handleConvert}
              loading={isConverting}
            >
              <Icon name="Receipt" size={16} />
              Convertir a Factura
            </Button>
          )}

          {/* Cancelled: view invoice */}
          {isCancelled && invoice && (
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={() => router.push(paths.sales.invoice(invoice.uid))}
            >
              <Icon name="FileText" size={16} />
              Ver Factura
            </Button>
          )}

          {/* Rejected: read only */}
          {isRejected && (
            <span className="text-sm text-muted-foreground italic px-2">
              Esta cotización fue rechazada
            </span>
          )}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* LEFT — Main content */}
        <div className="space-y-6">
          {/* General Info */}
          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 flex items-center justify-center rounded-full text-indigo-500 border border-indigo-500/20 bg-indigo-500/10 shrink-0">
                  <Icon name="Info" size={12} strokeWidth={3} />
                </div>
                <h2 className="text-sm font-bold text-foreground">Información General</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Input
                  label="Título"
                  required
                  value={quotation.title}
                  onChange={(e) =>
                    setLocalQuotation((p) => ({ ...p, title: e.target.value }) as Quotation)
                  }
                  placeholder="Título de la cotización"
                  disabled={!isEditable}
                />
                <SelectField
                  label="Moneda"
                  value={quotation.currency}
                  onChange={(val) =>
                    setLocalQuotation((p) => ({ ...p, currency: val as string }) as Quotation)
                  }
                  options={currencyOptions}
                  disabled={!isEditable}
                />
                <Input
                  label="Fecha de creación"
                  type="date"
                  value={toInputDate(quotation.created_at)}
                  onChange={(e) =>
                    setLocalQuotation((p) => ({ ...p, created_at: e.target.value }) as Quotation)
                  }
                  disabled={!isEditable}
                />
                <Input
                  label="Válido hasta"
                  type="date"
                  value={toInputDate(quotation.valid_until)}
                  onChange={(e) =>
                    setLocalQuotation((p) => ({ ...p, valid_until: e.target.value }) as Quotation)
                  }
                  disabled={!isEditable}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-none shadow-card overflow-hidden py-0 gap-0">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Icon name="Box" size={18} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground">Líneas de Producto</h2>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors"
              >
                <Icon name="Plus" size={14} />
                Agregar Línea
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/10">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Producto
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-24">
                      Cantidad
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-32">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-24">
                      Desc. %
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-32">
                      Total Línea
                    </th>
                    <th className="px-4 py-4 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Icon name="FileText" size={28} className="opacity-30" />
                          <span className="text-sm font-medium">
                            Sin líneas de producto. Agrega una para comenzar.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quotation.items.map((item, i) => (
                      <tr
                        key={item.uid}
                        className={`group hover:bg-muted/10 transition-colors ${
                          i < quotation.items.length - 1 && 'border-b border-border/40'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <SelectField
                            value={item.sku ?? ''}
                            onChange={(val) => {
                              const product = catalogProducts.find((p) => p.sku === val);
                              if (product) {
                                updateLine(item.uid, 'description', product.name);
                                updateLine(item.uid, 'sku', product.sku);
                                const price =
                                  product.default_price ?? product.inventory_product?.sale_price;
                                const discount =
                                  product.default_discount_percent ??
                                  product.inventory_product?.discount_percent;
                                if (price != null) {
                                  updateLine(item.uid, 'list_unit_price', String(price));
                                }
                                if (discount != null) {
                                  updateLine(item.uid, 'discount_percent', String(discount));
                                }
                              }
                            }}
                            options={catalogProducts.map((p) => ({
                              value: p.sku,
                              label: `${p.name} (${p.sku})`,
                            }))}
                            placeholder="Seleccionar producto..."
                            searchable
                            disabled={!isEditable}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <input
                              className="w-16 text-center border border-border/50 rounded-lg py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateLine(item.uid, 'quantity', e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            className="w-full bg-transparent border-none outline-none text-sm text-center font-medium text-foreground focus:ring-0"
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.list_unit_price}
                            onChange={(e) =>
                              updateLine(item.uid, 'list_unit_price', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              className="w-12 text-center border border-border/50 rounded-lg py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                              type="number"
                              min={0}
                              max={100}
                              value={item.discount_percent}
                              onChange={(e) =>
                                updateLine(item.uid, 'discount_percent', e.target.value)
                              }
                            />
                            <span className="text-muted-foreground text-xs">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                          {formatMoney(calcLineTotal(item), {
                            scope: 'tenant',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => removeLine(item.uid)}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Icon name="Trash2" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Notes */}
          {quotation.notes && (
            <Card className="border-none shadow-card">
              <CardContent className="p-6">
                <h2 className="text-sm font-bold text-foreground mb-2">Notas internas</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {quotation.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Opportunity Timeline */}
          {opp ? <OpportunityTimeline opportunity={opp} /> : null}
        </div>

        {/* RIGHT — Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card className="border-none shadow-card py-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Icon name="Receipt" size={16} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground">Resumen</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(totals.subtotal, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Descuento Total</span>
                  <span className="font-semibold text-emerald-500">
                    -
                    {formatMoney(totals.discount, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="border-t border-border/40 pt-4 mt-2 flex justify-between items-center">
                  <span className="font-bold text-foreground">Total Final</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(totals.total, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-none shadow-card bg-indigo-500 text-white dark:bg-indigo-600 gap-0 py-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon name="TrendingUp" size={20} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold tracking-wide">Estadísticas</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold mb-1">{totals.productCount}</p>
                  <p className="text-xs text-indigo-100">Productos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold mb-1">{totals.units}</p>
                  <p className="text-xs text-indigo-100">Unidades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
