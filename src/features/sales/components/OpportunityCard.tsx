'use client';

import type { Opportunity, PipelineStage } from 'src/features/sales/types/sales.types';
import { formatMoney } from 'src/lib/currency';
import { diffDays } from 'src/lib/date';
import { cn } from 'src/lib/utils';
import { Icon } from 'src/shared/components/ui/icon';

import { computeLeadScore } from '../config/pipeline.config';
import { DealAvatar } from './DealAvatar';

interface OpportunityCardProps {
  opportunity: Opportunity;
  stages: PipelineStage[];
  stageColor: string;
  onOpenPanel: (uid: string) => void;
  /** Se dispara cuando se suelta OTRA card sobre esta — insertarla antes de esta */
  onDropBefore?: (draggedUid: string, targetUid: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActivityStatus(updatedAt?: string, createdAt?: string) {
  const dateStr = updatedAt || createdAt;
  if (!dateStr) return { color: 'bg-slate-400', label: 'Sin datos' };
  const diff = diffDays(dateStr);
  if (diff <= 3) return { color: 'bg-emerald-500', label: updatedAt ? 'Reciente' : 'Nuevo' };
  if (diff <= 7) return { color: 'bg-amber-500', label: 'Falta atención' };
  return { color: 'bg-red-500', label: 'En riesgo' };
}

function getDaysInStage(opportunity: Opportunity): number {
  if (!opportunity.created_at) return 0;
  return diffDays(opportunity.created_at);
}

const LEAD_SCORE_CONFIG = {
  hot: {
    label: 'Caliente',
    className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  warm: {
    label: 'Tibio',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  cold: {
    label: 'Frío',
    className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
} as const;

export function OpportunityCard({
  opportunity,
  stages,
  stageColor,
  onOpenPanel,
  onDropBefore,
}: OpportunityCardProps) {
  const currentStage = stages.find((s) => s.uid === opportunity.stage_uid);
  // Campos explícitos del board (is_closed/closed_status) — con fallback a
  // won_at/lost_at por si el backend todavía no los manda en algún ambiente.
  const isWon = opportunity.closed_status === 'won' || !!opportunity.won_at;
  const isLost = opportunity.closed_status === 'lost' || !!opportunity.lost_at;
  const isTerminal = opportunity.is_closed ?? (isWon || isLost);
  const probability = currentStage?.probability_percent ?? 0;

  const activityIndicator = getActivityStatus(opportunity.updated_at, opportunity.created_at);
  const daysInStage = getDaysInStage(opportunity);
  const weightedAmount = (Number(opportunity.amount) || 0) * (probability / 100);

  const { label: leadScoreLabel, score: leadScoreValue } = computeLeadScore(opportunity, stages);
  const leadScoreCfg = LEAD_SCORE_CONFIG[leadScoreLabel];

  // Display name fallback: title (backend) → uid
  const displayName = opportunity.title || opportunity.uid;

  return (
    <div
      onClick={() => onOpenPanel(opportunity.uid)}
      draggable={!isTerminal}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', opportunity.uid);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.45';
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '';
      }}
      onDragOver={(e) => {
        if (!onDropBefore) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        if (!onDropBefore) return;
        e.preventDefault();
        e.stopPropagation(); // no burbujear al onDrop de la columna (movería de etapa)
        const draggedUid = e.dataTransfer.getData('text/plain');
        if (draggedUid && draggedUid !== opportunity.uid) {
          onDropBefore(draggedUid, opportunity.uid);
        }
      }}
      className={cn(
        'group relative bg-card rounded-2xl border border-border/60 p-4 select-none',
        'transition-all duration-200',
        !isTerminal &&
          'cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-black/5 hover:border-border hover:-translate-y-0.5',
        isWon && 'cursor-pointer hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5',
        isLost && 'opacity-55 cursor-pointer'
      )}
    >
      {/* Row 1: Avatar + name + badges */}
      <div className="flex items-start gap-2.5">
        <DealAvatar name={displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
            {displayName}
          </p>
          {opportunity.stage_name && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">
                {opportunity.stage_name}
              </span>
            </div>
          )}
        </div>
        {/* Right badges column */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isWon && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="Trophy" size={8} />
              Ganado
            </span>
          )}
          {isLost && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
              <Icon name="XCircle" size={8} />
              Perdido
            </span>
          )}
          {!isTerminal && leadScoreCfg && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                leadScoreCfg.className
              )}
            >
              <Icon name="Flame" size={8} />
              {leadScoreCfg.label}
            </span>
          )}
          {daysInStage > 0 && !isTerminal && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
              <Icon name="AlertTriangle" size={8} />
              {daysInStage}d
            </span>
          )}
        </div>
      </div>

      {/* Amount section */}
      <div className="mt-4">
        <span className="text-base font-extrabold" style={{ color: stageColor }}>
          {formatMoney(Number(opportunity.amount) || 0, {
            scope: 'tenant',
            maximumFractionDigits: 0,
          })}
        </span>
        {!isTerminal && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ≈ {formatMoney(weightedAmount, { scope: 'tenant', maximumFractionDigits: 0 })} ponderado
            ({probability}%)
          </p>
        )}
      </div>

      {/* Footer: activity status + lead score value */}
      <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', activityIndicator.color)} />
          <span className="text-[10px] text-muted-foreground">{activityIndicator.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isTerminal && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {leadScoreValue}/100
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
