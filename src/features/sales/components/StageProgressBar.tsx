import React from 'react';
import { cn } from 'src/lib/utils';

import { getStageColor } from '../config/pipeline.config';
import type { PipelineStage } from '../types/sales.types';

interface StageProgressBarProps {
  stages: PipelineStage[];
  currentStageUid: string;
}

export function StageProgressBar({ stages, currentStageUid }: StageProgressBarProps) {
  const currentStage = stages.find((s) => s.uid === currentStageUid);
  const isLost = currentStage?.is_lost ?? false;

  if (isLost) {
    return (
      <div className="flex items-center py-2 w-full max-w-sm">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.uid}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full opacity-30 bg-muted-foreground" />
              <span className="text-[9px] text-muted-foreground/40 font-medium truncate w-14 text-center hidden sm:block">
                {stage.name}
              </span>
            </div>
            {i < stages.length - 1 && <div className="h-px flex-1 bg-border/30 mb-4" />}
          </React.Fragment>
        ))}
        <div className="h-px w-3 bg-border/30 mb-4" />
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-[9px] text-destructive font-bold hidden sm:block">Perdido</span>
        </div>
      </div>
    );
  }

  const currentIndex = stages.findIndex((s) => s.uid === currentStageUid);

  return (
    <div className="flex items-center py-2 w-full max-w-sm">
      {stages.map((stage, i) => {
        const isDone = currentIndex >= 0 && i < currentIndex;
        const isCurrent = i === currentIndex;
        // Solo la etapa activa se pinta con su color — el resto (hecho o pendiente)
        // queda en gris neutro, para que el color resalte únicamente dónde está hoy.
        const dotColor = isCurrent ? getStageColor(stage, i).accent : '#9CA3AF';

        return (
          <React.Fragment key={stage.uid}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  'rounded-full transition-all',
                  isCurrent ? 'w-3 h-3 ring-2 ring-offset-1 ring-offset-background' : 'w-2.5 h-2.5',
                  isDone || isCurrent ? 'opacity-100' : 'opacity-25'
                )}
                style={{
                  backgroundColor: dotColor,
                  ...(isCurrent ? { boxShadow: `0 0 0 2px ${dotColor}40` } : {}),
                }}
              />
              <span
                className={cn(
                  'text-[9px] font-medium truncate w-14 text-center hidden sm:block',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground/50'
                )}
              >
                {stage.name}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 transition-all mb-4',
                  isDone ? 'opacity-70' : 'opacity-15'
                )}
                style={{ backgroundColor: '#9CA3AF' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
