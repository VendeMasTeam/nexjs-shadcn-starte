'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { catalogService } from 'src/features/sales/services/catalog.service';
import { quotationService } from 'src/features/sales/services/quotation.service';
import type { CatalogProduct } from 'src/features/sales/types/catalog.types';
import type { Quotation, QuotationItem } from 'src/features/sales/types/sales.types';
import { localizationService } from 'src/features/settings/services/localization.service';
import { formatMoney, getCurrencyPreferences } from 'src/lib/currency';
import { toDate } from 'src/lib/date';
import { notify } from 'src/lib/notify';
import { paths } from 'src/routes/paths';
import { PageContainer } from 'src/shared/components/layouts/page';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { DateInput } from 'src/shared/components/ui/date-input';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useDebounce } from 'use-debounce';

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

type QuotationViewProps =
  | { mode: 'create'; opportunityUid: string }
  | { mode: 'edit'; quotationId: string };

export function QuotationView(props: QuotationViewProps) {
  const router = useRouter();
  const { saveQuotation, convertQuotationToInvoice, invoices, opportunities } = useSalesContext();

  const isCreate = props.mode === 'create';
  const opportunityUid = isCreate ? props.opportunityUid : '';
  const quotationId = isCreate ? '' : props.quotationId;

  // Track if a draft has been saved and redirected to a new URL
  const [savedDraft, setSavedDraft] = useState<Quotation | null>(null);

  // In create mode we never fetch — there is no quotation yet.
  // In edit mode, skip the fetch only when we already have the saved draft in memory.
  const { quotation: byIdQuotation } = useQuotationById(
    isCreate || savedDraft?.uid === quotationId ? '' : quotationId
  );

  // Sync API result or saved draft into local state
  const [localQuotation, setLocalQuotation] = useState<Quotation | null>(() => {
    if (isCreate) {
      const opp = opportunities.find((o) => o.uid === opportunityUid);
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
        entity_uid: opportunityUid,
        notes: '',
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };
    }
    if (savedDraft?.uid === quotationId) return savedDraft;
    if (byIdQuotation) return byIdQuotation;
    return null;
  });

  // When API returns quotation (edit mode), update local state
  if (!isCreate && byIdQuotation && byIdQuotation.uid !== localQuotation?.uid && !savedDraft) {
    setLocalQuotation(byIdQuotation);
  }

  // Normalize API ISO date to YYYY-MM-DD for <input type="date">
  const toInputDate = (value: string | null | undefined): string => {
    if (!value) return '';
    return toDate(value).toISOString().split('T')[0];
  };

  const quotation = localQuotation;

  // Búsqueda server-side con debounce — no cargar todo el catálogo de una vez.
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 400);
  // Cachea el producto elegido por línea para que su label sobreviva a un
  // cambio de búsqueda que ya no lo incluya en `catalogProducts`.
  const [productItemCache, setProductItemCache] = useState<Record<number, CatalogProduct>>({});

  const { data: catalogResult } = useQuery({
    queryKey: ['catalog', 'products', debouncedProductSearch],
    queryFn: () =>
      catalogService.getPaginated({
        status: 'active',
        search: debouncedProductSearch || undefined,
        page: 1,
        per_page: 20,
      }),
    staleTime: 0,
  });
  const catalogProducts =
    ((catalogResult as Record<string, unknown>)?.data as CatalogProduct[]) ?? [];

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
  const opp = isCreate
    ? opportunities.find((o) => o.uid === opportunityUid)
    : byIdQuotation
      ? opportunities.find((o) => o.uid === byIdQuotation.quoteable_uid)
      : undefined;

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // ── Validation ───────────────────────────────────────────────────────────────
  const [titleError, setTitleError] = useState('');
  const [validUntilError, setValidUntilError] = useState('');
  type LineError = { sku?: string; quantity?: string; price?: string };
  const [lineErrors, setLineErrors] = useState<Record<number, LineError>>({});

  const clearLineError = useCallback((index: number, field: keyof LineError) => {
    setLineErrors((prev) => {
      if (!prev[index]?.[field]) return prev;
      const next = { ...prev, [index]: { ...prev[index] } };
      delete next[index][field];
      if (!Object.keys(next[index]).length) delete next[index];
      return next;
    });
  }, []);

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

  const updateLine = useCallback((index: number, field: keyof QuotationItem, rawValue: string) => {
    setLocalQuotation((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      const numFields: (keyof QuotationItem)[] = [
        'quantity',
        'list_unit_price',
        'discount_percent',
      ];
      const value = numFields.includes(field) ? Number(rawValue) : rawValue;
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }, []);

  const removeLine = useCallback((index: number) => {
    setLocalQuotation((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
    setProductItemCache((prev) => {
      const next: Record<number, CatalogProduct> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index) next[k] = val;
        else if (k > index) next[k - 1] = val;
      });
      return next;
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!quotation) return;

    // ── Validate ────────────────────────────────────────────────────────────
    let valid = true;

    if (!quotation.title?.trim()) {
      setTitleError('El título es requerido');
      valid = false;
    } else {
      setTitleError('');
    }

    const createdAt = toInputDate(quotation.created_at);
    const validUntil = toInputDate(quotation.valid_until);
    if (validUntil && createdAt && validUntil < createdAt) {
      setValidUntilError('No puede ser anterior a la fecha de creación');
      valid = false;
    } else {
      setValidUntilError('');
    }

    const newLineErrors: Record<number, LineError> = {};
    quotation.items.forEach((item, i) => {
      const e: LineError = {};
      if (!item.sku) e.sku = 'Selecciona un producto';
      if (!item.quantity || item.quantity < 1) e.quantity = 'Mínimo 1';
      if (!item.list_unit_price || item.list_unit_price <= 0) e.price = 'Requerido';
      if (Object.keys(e).length) newLineErrors[i] = e;
    });
    setLineErrors(newLineErrors);
    if (Object.keys(newLineErrors).length) valid = false;

    if (!valid) return;
    // ────────────────────────────────────────────────────────────────────────

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
      notify.success('Cotización guardada como borrador');
    } catch {
      notify.error('Error al guardar la cotización');
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
      notify.success('Cotización enviada al cliente');
    } catch {
      notify.error('Error al enviar la cotización');
    } finally {
      setIsSending(false);
    }
  };

  const handleReject = () => {
    if (!quotation) return;
    const updated = { ...quotation, status: 'rejected' as const };
    setLocalQuotation(updated);
    saveQuotation(updated);
    notify.info('Cotización marcada como rechazada');
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
      notify.success('Cotización aprobada');
    } catch {
      notify.error('Error al aprobar la cotización');
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
      notify.error('Error al descargar el PDF');
    }
  };

  const handleConvert = async () => {
    if (!quotation) return;
    setIsConverting(true);
    try {
      const invoice = await convertQuotationToInvoice(quotation.uid);
      if (invoice) {
        router.push(paths.sales.invoice(invoice.uid));
      }
    } catch {
      // error already notified by SalesContext
    } finally {
      setIsConverting(false);
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
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 min-w-0">
        <div className="min-w-0">
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

        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto min-w-0 mt-2 md:mt-0">
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

          {/* Send — draft, sent (resend), approved */}
          {quotation.uid && (isDraft || isSent || isApproved) && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleSend}
              loading={isSending}
              disabled={quotation.items.length === 0}
            >
              <Icon name="Send" size={16} />
              Enviar al cliente
            </Button>
          )}

          {/* Draft: save + approve */}
          {isDraft && (
            <>
              <Button variant="outline" onClick={handleSave} loading={isSaving}>
                <Icon name="Save" size={16} />
                Guardar borrador
              </Button>
              {/* Rechazar/Aprobar only make sense once the quotation exists */}
              {quotation.uid && (
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
                    variant="outline"
                    className="border-emerald-400 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={handleApprove}
                    loading={isApproving}
                    disabled={quotation.items.length === 0}
                  >
                    <Icon name="CheckCircle2" size={16} />
                    Aprobar
                  </Button>
                </>
              )}
            </>
          )}

          {/* Sent: waiting for client response */}
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
        <div className="space-y-6 min-w-0">
          {/* General Info */}
          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 flex items-center justify-center rounded-full text-indigo-500 border border-indigo-500/20 bg-indigo-500/10 shrink-0">
                  <Icon name="Info" size={12} strokeWidth={3} />
                </div>
                <h2 className="text-sm font-bold text-foreground">Información General</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5">
                <Input
                  label="Título"
                  required
                  value={quotation.title}
                  onChange={(e) => {
                    if (titleError) setTitleError('');
                    setLocalQuotation((p) => ({ ...p, title: e.target.value }) as Quotation);
                  }}
                  placeholder="Título de la cotización"
                  disabled={!isEditable}
                  error={titleError}
                />
                <SelectField
                  label="Moneda"
                  value={quotation.currency}
                  onChange={(val) =>
                    setLocalQuotation((p) => ({ ...p, currency: val as string }) as Quotation)
                  }
                  options={currencyOptions}
                  disabled={!isEditable}
                  searchable
                />
                <DateInput
                  label="Fecha de creación"
                  value={toInputDate(quotation.created_at)}
                  onChange={(e) => {
                    if (validUntilError) setValidUntilError('');
                    setLocalQuotation((p) => ({ ...p, created_at: e.target.value }) as Quotation);
                  }}
                  disabled={!isEditable}
                />
                <DateInput
                  label="Válido hasta"
                  value={toInputDate(quotation.valid_until)}
                  onChange={(e) => {
                    if (validUntilError) setValidUntilError('');
                    setLocalQuotation((p) => ({ ...p, valid_until: e.target.value }) as Quotation);
                  }}
                  minDate={
                    quotation.created_at ? new Date(toInputDate(quotation.created_at)) : undefined
                  }
                  disabled={!isEditable}
                  error={validUntilError}
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
                    <th className="px-4 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-40">
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
                        key={item.uid || i}
                        className={`group hover:bg-muted/10 transition-colors ${
                          i < quotation.items.length - 1 && 'border-b border-border/40'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <SelectField
                            value={item.sku ?? ''}
                            onChange={(val) => {
                              clearLineError(i, 'sku');
                              const product = catalogProducts.find((p) => p.sku === val);
                              if (product) {
                                setProductItemCache((prev) => ({ ...prev, [i]: product }));
                                updateLine(i, 'description', product.name);
                                updateLine(i, 'sku', product.sku);
                                const price =
                                  product.default_price ?? product.inventory_product?.sale_price;
                                const discount =
                                  product.default_discount_percent ??
                                  product.inventory_product?.discount_percent;
                                if (price != null) {
                                  updateLine(i, 'list_unit_price', String(price));
                                }
                                if (discount != null) {
                                  updateLine(i, 'discount_percent', String(discount));
                                }
                              }
                              setProductSearch('');
                            }}
                            options={(() => {
                              const base = catalogProducts.map((p) => {
                                const missingInventory =
                                  p.type === 'product' && !p.inventory_product_uid;
                                const alreadyAdded = quotation.items.some(
                                  (it, idx) => idx !== i && it.sku === p.sku
                                );
                                return {
                                  value: p.sku,
                                  label: missingInventory
                                    ? `${p.name} (${p.sku}) — Sin inventario vinculado`
                                    : alreadyAdded
                                      ? `${p.name} (${p.sku}) — Ya agregado`
                                      : `${p.name} (${p.sku})`,
                                  disabled: missingInventory || alreadyAdded,
                                };
                              });
                              // Si el producto ya elegido en esta línea quedó afuera de la
                              // búsqueda actual, lo agregamos igual para no perder el label.
                              const cached = productItemCache[i];
                              if (cached && item.sku && !base.find((o) => o.value === item.sku)) {
                                return [
                                  { value: cached.sku, label: `${cached.name} (${cached.sku})` },
                                  ...base,
                                ];
                              }
                              return base;
                            })()}
                            placeholder="Seleccionar producto..."
                            searchable
                            onSearch={setProductSearch}
                            disabled={!isEditable}
                            error={lineErrors[i]?.sku}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              className={`w-16 text-center border rounded-lg py-1.5 text-sm font-medium focus:ring-1 outline-none transition-all ${lineErrors[i]?.quantity ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : 'border-border/50 focus:border-indigo-500 focus:ring-indigo-500'}`}
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                clearLineError(i, 'quantity');
                                updateLine(i, 'quantity', e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === '-') e.preventDefault();
                              }}
                              disabled={!isEditable}
                            />
                            {lineErrors[i]?.quantity && (
                              <p className="text-[0.7rem] text-destructive leading-tight text-center">
                                {lineErrors[i].quantity}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center min-w-[140px]">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              className={`w-full text-center text-sm font-medium text-foreground outline-none transition-all rounded px-1 ${lineErrors[i]?.price ? 'bg-destructive/5 ring-1 ring-destructive/50' : 'bg-transparent border-none focus:ring-0'}`}
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.list_unit_price}
                              onChange={(e) => {
                                clearLineError(i, 'price');
                                updateLine(i, 'list_unit_price', e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === '-') e.preventDefault();
                              }}
                              disabled={!isEditable}
                            />
                            {lineErrors[i]?.price && (
                              <p className="text-[0.7rem] text-destructive leading-tight text-center">
                                {lineErrors[i].price}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              className="w-12 text-center border border-border/50 rounded-lg py-1.5 text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                              type="number"
                              min={0}
                              max={100}
                              value={item.discount_percent}
                              onChange={(e) => {
                                const clamped = Math.min(100, Math.max(0, Number(e.target.value)));
                                updateLine(i, 'discount_percent', String(clamped));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === '-') e.preventDefault();
                              }}
                              disabled={!isEditable}
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
                            onClick={() => removeLine(i)}
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
        <div className="space-y-6 min-w-0">
          {/* Summary */}
          <Card className="border-none shadow-card py-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Icon name="Receipt" size={16} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground">Resumen</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">Subtotal</span>
                  <span className="font-semibold text-foreground text-right tabular-nums break-all min-w-0">
                    {formatMoney(totals.subtotal, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">Descuento Total</span>
                  <span className="font-semibold text-emerald-500 text-right tabular-nums break-all min-w-0">
                    -
                    {formatMoney(totals.discount, {
                      scope: 'tenant',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="border-t border-border/40 pt-4 mt-2 flex justify-between items-baseline gap-3">
                  <span className="font-bold text-foreground shrink-0">Total Final</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 text-right tabular-nums break-all min-w-0">
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
