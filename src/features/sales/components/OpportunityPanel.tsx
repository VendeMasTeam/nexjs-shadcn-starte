'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { PipelineStage } from 'src/features/sales/types/sales.types';
import { formatMoney } from 'src/lib/currency';
import { toDate } from 'src/lib/date';
import { queryKeys } from 'src/lib/query-keys';
import { cn } from 'src/lib/utils';
import { paths } from 'src/routes/paths';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Sheet, SheetContent, SheetTitle } from 'src/shared/components/ui/sheet';

import { useIntelligence } from 'src/features/intelligence/hooks/useIntelligence';
import { useSalesContext } from '../context/SalesContext';
import type { AgingLevel } from '../hooks/useOpportunityPanel';
import { invoiceService } from '../services/invoice.service';
import { opportunityService } from '../services/opportunity.service';
import { quotationService } from '../services/quotation.service';
import type { Invoice, LostReasonInfo, Opportunity, Quotation } from '../types/sales.types';
import { STATUS_LABELS } from '../types/sales.types';
import { DealAvatar } from './DealAvatar';
import { NewOpportunityDrawer } from './NewOpportunityDrawer';
import { OpportunityChecklist } from './OpportunityChecklist';
import { OpportunityQuotationsTab } from './OpportunityQuotationsTab';
import { OpportunityTimeline } from './OpportunityTimeline';
import { OutcomeDialog } from './OutcomeDialog';
import { StageProgressBar } from './StageProgressBar';

type TabId = 'resumen' | 'actividades' | 'cotizaciones' | 'factura' | 'tareas';

const TABS: { id: TabId; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'actividades', label: 'Actividades' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'factura', label: 'Factura' },
  { id: 'tareas', label: 'Tareas' },
];

const AGING_STYLES: Record<AgingLevel, { label: string; className: string }> = {
  normal: { label: '', className: '' },
  warning: { label: 'd en etapa', className: 'bg-warning/10 text-warning' },
  risk: { label: 'd en etapa', className: 'bg-orange-500/10 text-orange-500' },
  stalled: { label: 'd estancado', className: 'bg-destructive/10 text-destructive' },
};

function formatDate(dateStr: string): string {
  try {
    return format(toDate(dateStr), 'd MMM yyyy', { locale: es });
  } catch {
    return dateStr;
  }
}

interface InvoiceTabProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
}

function InvoiceTab({ opportunity, stages: _stages }: InvoiceTabProps) {
  const router = useRouter();

  // Fetch quotations linked to this opportunity
  const { data: linkedQuotations = [] } = useQuery<Quotation[]>({
    queryKey: queryKeys.sales.quotationsByOpportunity(opportunity.uid),
    queryFn: () => quotationService.getByOpportunity(opportunity.uid),
    staleTime: 0,
  });

  // Fetch invoices for the first linked quotation
  const firstQuotationUid = linkedQuotations[0]?.uid;

  const { data: quotationInvoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: queryKeys.sales.invoicesByQuotation(firstQuotationUid ?? ''),
    queryFn: () => invoiceService.getByQuotation(firstQuotationUid!),
    enabled: !!firstQuotationUid,
    staleTime: 0,
  });

  const invoice = quotationInvoices[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-body2 text-muted-foreground">Cargando factura…</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-body2 text-muted-foreground">Sin factura generada</p>
        <p className="text-caption text-muted-foreground/60">
          Convertí una cotización aprobada para generar la factura.
        </p>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[invoice.status] ?? invoice.status;
  const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    paid: 'success',
    partial: 'warning',
    issued: 'default',
    draft: 'default',
    overdue: 'error',
  };

  const pending = invoice.outstanding_total;
  const progress = invoice.total > 0 ? Math.round((invoice.paid_total / invoice.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-body2 font-bold text-foreground font-mono">{invoice.invoice_number}</p>
          <p className="text-caption text-muted-foreground">{formatDate(invoice.issued_at)}</p>
        </div>
        <Badge variant="soft" color={STATUS_COLOR[invoice.status] ?? 'default'}>
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-caption text-muted-foreground mb-0.5">Total</p>
          <p className="text-body2 font-bold text-foreground">
            {formatMoney(invoice.total, { scope: 'tenant', maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-caption text-muted-foreground mb-0.5">Pendiente</p>
          <p className="text-body2 font-bold text-destructive">
            {formatMoney(pending, { scope: 'tenant', maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-caption text-muted-foreground">
          <span>Pagado</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => router.push(paths.sales.invoice(invoice.uid))}
      >
        Ver factura completa
      </Button>
    </div>
  );
}

interface ResumenTabProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  onEdit: (opportunity: Opportunity) => void;
  onOutcome: () => void;
}

function ResumenTab({ opportunity, stages, onEdit, onOutcome }: ResumenTabProps) {
  const router = useRouter();

  // Fetch quotations linked to this opportunity
  const { data: linkedQuotations = [], isLoading: quotesLoading } = useQuery<Quotation[]>({
    queryKey: queryKeys.sales.quotationsByOpportunity(opportunity.uid),
    queryFn: () => quotationService.getByOpportunity(opportunity.uid),
    staleTime: 0,
  });

  const currentStage = stages.find((s) => s.uid === opportunity.stage_uid);
  const isWon = currentStage?.is_won ?? false;
  const isLost = currentStage?.is_lost ?? false;
  const isTerminal = isWon || isLost;
  const probability = currentStage?.probability_percent ?? 0;
  const weightedAmount = opportunity.amount * (probability / 100);

  const lostReasons = opportunity.lost_reasons;

  // First linked quotation for summary
  const quotation = linkedQuotations[0];
  const quotationTotal = quotation
    ? quotation.items.reduce(
        (s, item) => s + item.list_unit_price * item.quantity * (1 - item.discount_percent / 100),
        0
      )
    : 0;
  const quotationStatusLabel = quotation
    ? (STATUS_LABELS[quotation.status] ?? quotation.status)
    : '';
  const QUOTATION_STATUS_COLOR: Record<
    string,
    'default' | 'success' | 'warning' | 'error' | 'info'
  > = {
    draft: 'default',
    sent: 'info',
    approved: 'success',
    rejected: 'error',
    cancelled: 'error',
    invoiced: 'success',
  };

  return (
    <div className="space-y-5">
      {/* Lost reason info — populated from GET /opportunities/{uid} detail */}
      {isLost && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Icon name="AlertTriangle" size={14} className="text-destructive shrink-0" />
            <span className="text-caption font-bold text-destructive uppercase tracking-wide">
              Oportunidad perdida
            </span>
          </div>
          {lostReasons && lostReasons.length > 0 ? (
            <ul className="space-y-1.5">
              {lostReasons.map((reason, i) => (
                <li key={i} className="text-caption text-muted-foreground">
                  <span className="font-medium text-foreground">{reason.category}</span>
                  {reason.competitor_name && (
                    <span className="text-muted-foreground/70">
                      {' '}
                      — Competidor: {reason.competitor_name}
                    </span>
                  )}
                  {reason.detail && (
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{reason.detail}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-muted-foreground">
              La información de pérdida se registra al mover a etapa final.
            </p>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/30 p-3 space-y-0.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon name="DollarSign" size={13} />
            <span className="text-caption">Monto</span>
          </div>
          <p className="text-body2 font-bold text-foreground">
            {formatMoney(opportunity.amount, {
              scope: 'tenant',
              maximumFractionDigits: 0,
            })}
          </p>
          {!isTerminal && (
            <p className="text-[10px] text-muted-foreground">
              Ponderado:{' '}
              {formatMoney(weightedAmount, { scope: 'tenant', maximumFractionDigits: 0 })}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-muted/30 p-3 space-y-0.5">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon name="Calendar" size={13} />
            <span className="text-caption">Cierre esperado</span>
          </div>
          <p className="text-body2 font-bold text-foreground">
            {formatDate(opportunity.expected_close_date)}
          </p>
        </div>

        {probability > 0 && (
          <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
            <span className="text-caption text-muted-foreground">Probabilidad</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    probability >= 70
                      ? 'bg-success'
                      : probability >= 40
                        ? 'bg-warning'
                        : 'bg-destructive'
                  )}
                  style={{ width: `${probability}%` }}
                />
              </div>
              <span className="text-caption font-bold text-foreground shrink-0">
                {probability}%
              </span>
            </div>
          </div>
        )}

        {opportunity.currency && (
          <div className="rounded-xl bg-muted/30 p-3 space-y-0.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon name="Globe" size={13} />
              <span className="text-caption">Moneda</span>
            </div>
            <p className="text-body2 font-bold text-foreground">{opportunity.currency}</p>
          </div>
        )}
      </div>

      {/* Quotation summary — shown when opportunity has at least one quotation */}
      {quotesLoading ? (
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3 animate-pulse">
          <div className="h-4 bg-indigo-500/20 rounded w-24 mb-2" />
          <div className="h-3 bg-indigo-500/10 rounded w-16" />
        </div>
      ) : quotation ? (
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Icon name="FileText" size={13} className="text-indigo-500" />
              <span className="text-caption font-bold text-indigo-600 dark:text-indigo-400">
                {quotation.quote_number}
              </span>
              <Badge variant="soft" color={QUOTATION_STATUS_COLOR[quotation.status] ?? 'default'}>
                {quotationStatusLabel}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10"
              onClick={() => router.push(paths.sales.quotation(quotation.uid))}
            >
              <Icon name="Eye" size={13} />
              Ver
            </Button>
          </div>
          <p className="text-body2 font-bold text-foreground">
            {formatMoney(quotationTotal, { scope: 'tenant', maximumFractionDigits: 0 })}
          </p>
        </div>
      ) : !isTerminal ? (
        <div className="rounded-xl bg-muted/20 border border-dashed border-border/60 p-3 text-center">
          <p className="text-caption text-muted-foreground">
            Sin cotización — creá una para avanzar en el cierre
          </p>
        </div>
      ) : null}

      {/* Meta info + Edit button */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          {opportunity.opportunityable_type && (
            <div className="flex items-center gap-2 text-body2">
              <Icon name="Tag" size={13} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Tipo:</span>
              <span className="text-foreground font-medium">
                {opportunity.opportunityable_type}
              </span>
            </div>
          )}
          {opportunity.description && (
            <div className="flex items-start gap-2 text-body2">
              <Icon name="FileText" size={13} className="text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{opportunity.description}</span>
            </div>
          )}
          {opportunity.email && (
            <div className="flex items-center gap-2 text-body2">
              <Icon name="Mail" size={13} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground font-medium">{opportunity.email}</span>
            </div>
          )}
        </div>
        {!isTerminal && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(opportunity)}
          >
            <Icon name="Pencil" size={14} />
          </Button>
        )}
      </div>

      {/* CTA — route to existing quotation or create new one */}
      {!isTerminal && (
        <div className="border-t border-border/40 pt-4 space-y-2">
          {quotation ? (
            <Button
              color="primary"
              className="w-full"
              onClick={() => router.push(paths.sales.quotation(quotation.uid))}
            >
              <Icon name="Eye" size={14} />
              Ver cotización
            </Button>
          ) : (
            <Button
              color="primary"
              className="w-full"
              onClick={() => router.push(paths.sales.quotation(opportunity.uid))}
            >
              <Icon name="Plus" size={14} />
              Crear cotización
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50"
              onClick={onOutcome}
            >
              <Icon name="Trophy" size={13} />
              Ganado
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
              onClick={onOutcome}
            >
              <Icon name="XCircle" size={13} />
              Perdido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface OpportunityPanelProps {
  opportunityId: string | null;
  isOpen: boolean;
  onClose: () => void;
  daysInStage: number;
  agingLevel: AgingLevel;
  stages: PipelineStage[];
  opportunity: Opportunity | null;
}

export function OpportunityPanel({
  opportunityId: _opportunityId,
  isOpen,
  onClose,
  daysInStage,
  agingLevel,
  stages,
  opportunity,
}: OpportunityPanelProps) {
  const { updateOpportunity, refreshOpportunities } = useSalesContext();
  const queryClient = useQueryClient();
  const { competitors = [] } = useIntelligence();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);

  const agingStyle = AGING_STYLES[agingLevel];
  const currentStage = opportunity
    ? stages.find((s) => s.uid === opportunity.stage_uid)
    : undefined;
  const stageLabel = currentStage?.name ?? opportunity?.stage_name;

  const displayName = opportunity?.title || opportunity?.uid || '';

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[680px] flex flex-col p-0">
        <SheetTitle className="sr-only">
          {opportunity ? displayName : 'Panel de oportunidad'}
        </SheetTitle>
        {opportunity ? (
          <>
            {/* Header */}
            <div className="px-6 pr-10 pt-6 pb-4 border-b border-border/40 space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                <DealAvatar name={displayName} size="lg" />
                <div className="min-w-0">
                  <h2 className="text-subtitle1 font-bold text-foreground leading-tight truncate">
                    {displayName}
                  </h2>
                  <p className="text-caption text-muted-foreground/70 mt-0.5">
                    <span className="font-semibold text-foreground">
                      {formatMoney(opportunity.amount, {
                        scope: 'tenant',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    {stageLabel && <span className="text-muted-foreground"> · {stageLabel}</span>}
                  </p>
                  {agingLevel !== 'normal' && daysInStage > 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full',
                        agingStyle.className
                      )}
                    >
                      <Icon name="AlertTriangle" size={9} />
                      {daysInStage}
                      {agingStyle.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <StageProgressBar stages={stages} currentStageUid={opportunity.stage_uid} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/40 px-6 overflow-x-auto custom-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tabs content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              {activeTab === 'resumen' && (
                <ResumenTab
                  opportunity={opportunity}
                  stages={stages}
                  onEdit={(opp) => {
                    setEditingOpportunity(opp);
                    setEditDrawerOpen(true);
                  }}
                  onOutcome={() => setOutcomeDialogOpen(true)}
                />
              )}
              {activeTab === 'actividades' && <OpportunityTimeline opportunity={opportunity} />}
              {activeTab === 'cotizaciones' && (
                <OpportunityQuotationsTab opportunity={opportunity} stages={stages} />
              )}
              {activeTab === 'factura' && <InvoiceTab opportunity={opportunity} stages={stages} />}
              {activeTab === 'tareas' && <OpportunityChecklist opportunity={opportunity} />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-body2">Seleccioná un deal</p>
          </div>
        )}
      </SheetContent>

      {/* Edit drawer */}
      <NewOpportunityDrawer
        key={editingOpportunity?.uid ?? 'new'}
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingOpportunity(null);
        }}
        onSave={(payload) => {
          if (!editingOpportunity) return;
          updateOpportunity(editingOpportunity.uid, payload as Partial<Opportunity>);
          setEditDrawerOpen(false);
          setEditingOpportunity(null);
        }}
        stages={stages}
        isEditing={true}
        editingData={
          editingOpportunity
            ? {
                uid: editingOpportunity.uid,
                title: editingOpportunity.title,
                amount: editingOpportunity.amount,
                stage_uid: editingOpportunity.stage_uid,
                expected_close_date: editingOpportunity.expected_close_date,
                description: editingOpportunity.description,
                email: editingOpportunity.email,
              }
            : null
        }
      />

      {/* Outcome dialog — ganado / perdido */}
      {opportunity && (
        <OutcomeDialog
          open={outcomeDialogOpen}
          clientName={opportunity.title}
          competitors={competitors}
          onConfirm={async (outcome, lostReason) => {
            try {
              if (outcome === 'ganado') {
                await opportunityService.markWon(opportunity.uid);
                toast.success('Oportunidad marcada como ganada');
              } else {
                await opportunityService.markLost(
                  opportunity.uid,
                  lostReason ? [lostReason] : []
                );
                toast.success('Oportunidad marcada como perdida');
              }
              queryClient.invalidateQueries({ queryKey: ['opportunities'] });
              await refreshOpportunities();
              setOutcomeDialogOpen(false);
              onClose();
            } catch {
              toast.error('Error al registrar el resultado');
            }
          }}
          onCancel={() => setOutcomeDialogOpen(false)}
        />
      )}
    </Sheet>
  );
}
