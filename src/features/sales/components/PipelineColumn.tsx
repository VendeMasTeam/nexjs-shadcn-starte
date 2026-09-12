'use client';

import { useState } from 'react';
import type { Opportunity, PipelineStage } from 'src/features/sales/types/sales.types';
import { formatMoney } from 'src/lib/currency';
import { cn } from 'src/lib/utils';

import { OpportunityCard } from './OpportunityCard';

interface PipelineColumnProps {
  stage: PipelineStage;
  stages: PipelineStage[];
  opportunities: Opportunity[];
  onCardDrop: (oppUid: string, targetStageUid: string) => void;
  onOpenPanel: (uid: string) => void;
  onReorder: (stageUid: string, orderedUids: string[]) => void;
}

export function PipelineColumn({
  stage,
  stages,
  opportunities,
  onCardDrop,
  onOpenPanel,
  onReorder,
}: PipelineColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isTerminal = stage.is_won || stage.is_lost;
  const probability = stage.probability_percent / 100;
  const totalValue = opportunities.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const weightedValue = opportunities.reduce(
    (sum, o) => sum + (Number(o.amount) || 0) * probability,
    0
  );

  // Se dispara al soltar una card ENCIMA de otra: si son de la misma etapa, reordena
  // insertando la arrastrada justo antes de la que recibió el drop. Si viene de otra
  // etapa, delega en onCardDrop (cambio de etapa) — reordenar ahí no aplica todavía.
  const handleDropBefore = (draggedUid: string, targetUid: string) => {
    const draggedOpp = opportunities.find((o) => o.uid === draggedUid);
    if (!draggedOpp) {
      onCardDrop(draggedUid, stage.uid);
      return;
    }
    const withoutDragged = opportunities.filter((o) => o.uid !== draggedUid);
    const targetIndex = withoutDragged.findIndex((o) => o.uid === targetUid);
    const newOrder = [
      ...withoutDragged.slice(0, targetIndex),
      draggedOpp,
      ...withoutDragged.slice(targetIndex),
    ];
    onReorder(
      stage.uid,
      newOrder.map((o) => o.uid)
    );
  };

  return (
    <div className="flex flex-col flex-1 min-w-[260px]">
      {/* Mini stats */}
      <div className="flex items-center justify-between mb-2 px-0.5 h-8">
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{
            backgroundColor: `${stage.color ?? '#6B7280'}20`,
            color: stage.color ?? '#6B7280',
          }}
        >
          {opportunities.length}
        </span>
        {opportunities.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-medium text-muted-foreground leading-tight">
              {formatMoney(totalValue, { maximumFractionDigits: 0 })}
            </p>
            {!isTerminal && (
              <p className="text-[9px] text-muted-foreground/50 leading-tight">
                {formatMoney(weightedValue, { maximumFractionDigits: 0 })} pond.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'flex flex-col gap-2.5 min-h-[200px] rounded-2xl transition-all duration-200',
          isDragOver && 'bg-primary/4'
        )}
        style={isDragOver ? { outline: `2px solid ${stage.color ?? '#6B7280'}60` } : {}}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (!isDragOver) setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const oppUid = e.dataTransfer.getData('text/plain');
          if (oppUid) onCardDrop(oppUid, stage.uid);
        }}
      >
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-border/30 text-muted-foreground/30">
            <span className="text-xs">Sin oportunidades</span>
          </div>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp.uid}
              opportunity={opp}
              stages={stages}
              stageColor={stage.color ?? '#6B7280'}
              onOpenPanel={onOpenPanel}
              onDropBefore={handleDropBefore}
            />
          ))
        )}
      </div>
    </div>
  );
}
