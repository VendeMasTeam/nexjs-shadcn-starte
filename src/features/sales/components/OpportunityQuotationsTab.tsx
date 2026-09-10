'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { formatMoney } from 'src/lib/currency';
import { queryKeys } from 'src/lib/query-keys';
import { paths } from 'src/routes/paths';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';

import { quotationService } from '../services/quotation.service';
import type { Opportunity, PipelineStage, Quotation } from '../types/sales.types';
import { STATUS_LABELS } from '../types/sales.types';

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  sent: 'info',
  approved: 'success',
  rejected: 'error',
  cancelled: 'error',
};

interface OpportunityQuotationsTabProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
}

export function OpportunityQuotationsTab({ opportunity, stages }: OpportunityQuotationsTabProps) {
  const router = useRouter();

  const { data: linked = [], isLoading } = useQuery<Quotation[]>({
    queryKey: queryKeys.sales.quotationsByOpportunity(opportunity.uid),
    queryFn: () => quotationService.getByOpportunity(opportunity.uid),
    staleTime: 0,
  });

  const currentStage = stages.find((s) => s.uid === opportunity.stage_uid);
  const isTerminal = currentStage?.is_won || currentStage?.is_lost;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-body2 text-muted-foreground">Cargando cotizaciones…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {linked.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
            <Icon name="FileText" size={22} className="text-muted-foreground" />
          </div>
          <p className="text-body2 text-muted-foreground">Sin cotizaciones aún</p>
          {!isTerminal && (
            <Button
              size="sm"
              color="primary"
              onClick={() => router.push(paths.sales.quotationNew(opportunity.uid))}
            >
              <Icon name="Plus" size={14} />
              Crear cotización
            </Button>
          )}
        </div>
      ) : (
        <>
          {linked.map((q) => {
            const total = q.items.reduce(
              (sum, item) =>
                sum + item.list_unit_price * item.quantity * (1 - item.discount_percent / 100),
              0
            );
            const statusLabel = STATUS_LABELS[q.status] ?? q.status;
            return (
              <div
                key={q.uid}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body2 font-bold text-foreground font-mono">
                      {q.quote_number}
                    </span>
                    <Badge variant="soft" color={STATUS_COLOR[q.status] ?? 'default'}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <span className="text-caption text-muted-foreground">{q.created_at}</span>
                  <span className="text-caption font-semibold text-foreground">
                    {formatMoney(total, { scope: 'tenant', maximumFractionDigits: 0 })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(paths.sales.quotation(q.uid))}
                >
                  Ver
                  <Icon name="ArrowRight" size={13} />
                </Button>
              </div>
            );
          })}
          {!isTerminal && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(paths.sales.quotationNew(opportunity.uid))}
            >
              <Icon name="Plus" size={14} />
              Nueva cotización
            </Button>
          )}
        </>
      )}
    </div>
  );
}
