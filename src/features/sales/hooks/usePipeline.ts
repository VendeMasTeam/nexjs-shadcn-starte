'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';

import { computeLeadScore } from '../config/pipeline.config';
import { opportunityService } from '../services/opportunity.service';
import type { Opportunity, PipelineStage } from '../types/sales.types';

export function usePipeline() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  const [product, setProduct] = useState<string | undefined>(undefined);

  const {
    data: stages = [] as PipelineStage[],
    isLoading: stagesLoading,
    error: stagesError,
  } = useQuery<PipelineStage[]>({
    queryKey: queryKeys.sales.stages,
    queryFn: () => opportunityService.getStages(),
    staleTime: 0,
  });

  const {
    data: opportunities = [] as Opportunity[],
    isLoading: oppsLoading,
    error: oppsError,
  } = useQuery<Opportunity[]>({
    queryKey: [...queryKeys.sales.board, search, origin, product],
    queryFn: async () => {
      const params: {
        search?: string;
        origin?: string;
        product?: string;
        closed_days?: number;
        include_closed?: boolean;
      } = { closed_days: 7, include_closed: true };
      if (search) params.search = search;
      if (origin) params.origin = origin;
      if (product) params.product = product;
      const boardData = await opportunityService.getBoard(params);
      // Backend returns { stages: [{ stage, summary, items: [...] }], pagination }
      if (boardData?.stages) {
        return (boardData.stages as Array<{ items?: Array<Record<string, unknown>> }>)
          .flatMap((s) => s.items ?? [])
          .map((item) => ({
            ...item,
            amount: Number(item.amount) || 0,
          })) as Opportunity[];
      }
      return Array.isArray(boardData) ? boardData : Object.values(boardData).flat();
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const isLoading = stagesLoading || oppsLoading;
  const error = stagesError || oppsError;

  // NOTE: computeLeadScore, pipelineMetrics computed client-side.
  // Backend does not yet expose search/scoring endpoints.
  // See required-backend-v2/GAP-08

  // ─── Lead scoring (client-side using API data) ──────────────────────────────

  const scoredOpportunities = useMemo<Opportunity[]>(
    () =>
      opportunities.map((opp) => {
        const stage = stages.find((s) => s.uid === opp.stage_uid);
        if (stage?.is_won) return opp;
        const { score, label } = computeLeadScore(opp, stages);
        return { ...opp, _leadScoreValue: score, _leadScore: label } as Opportunity & {
          _leadScoreValue: number;
          _leadScore: string;
        };
      }),
    [opportunities, stages]
  );

  // ─── Group by stage ─────────────────────────────────────────────────────────

  const opportunitiesByStage = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    stages.forEach((s) => map.set(s.uid, []));
    scoredOpportunities.forEach((opp) => {
      const list = map.get(opp.stage_uid);
      if (list) list.push(opp);
    });
    // Orden explícito por kanban_position — necesario para que el reorder
    // (drag and drop dentro de la columna) se refleje apenas se actualiza el cache.
    map.forEach((list) => list.sort((a, b) => (a.kanban_position ?? 0) - (b.kanban_position ?? 0)));
    return map;
  }, [scoredOpportunities, stages]);

  // ─── Metrics ────────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const active = scoredOpportunities.filter((opp) => {
      const stage = stages.find((s) => s.uid === opp.stage_uid);
      return !stage?.is_won && !stage?.is_lost;
    });
    const closedWon = scoredOpportunities.filter((opp) => {
      const stage = stages.find((s) => s.uid === opp.stage_uid);
      return stage?.is_won;
    });

    const totalPipelineValue = active.reduce((sum, o) => sum + (o.amount || 0), 0);
    const forecastValue = active.reduce((sum, o) => {
      const stage = stages.find((s) => s.uid === o.stage_uid);
      return sum + (o.amount || 0) * ((stage?.probability_percent ?? 0) / 100);
    }, 0);

    return {
      totalPipelineValue,
      forecastValue,
      activeCount: active.length,
      closedWonCount: closedWon.length,
    };
  }, [scoredOpportunities, stages]);

  return {
    stages,
    opportunitiesByStage,
    scoredOpportunities,
    metrics,
    search,
    setSearch,
    origin,
    setOrigin,
    product,
    setProduct,
    isLoading,
    error: (error ?? null) as Error | null,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.stages });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.board });
    },
  };
}
