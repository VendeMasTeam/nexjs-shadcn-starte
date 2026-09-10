'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { useLostReasonCategories } from 'src/shared/hooks/useTenantOptions';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { intelligenceService } from '../services/intelligence.service';

function normalizeBattlecard(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    our_strengths: raw.differentiators ?? raw.our_strengths ?? [],
    their_strengths: raw.recommended_actions ?? raw.their_strengths ?? [],
    objections: raw.objection_handlers ?? raw.objections ?? [],
  };
}
import type {
  Battlecard,
  Competitor,
  HeatmapCell,
  IntelligenceStats,
  LostReason,
  LostReasonCategory,
} from '../types';

interface IntelligenceFilters {
  lostReasonType?: string;
  lostReasonCompetitorUid?: string;
}

export function useIntelligence(filters: IntelligenceFilters = {}) {
  const queryClient = useQueryClient();

  // ─── Tenant-driven categories (fetched from backend) ──────────────────────

  const lostReasonQuery = useLostReasonCategories();

  const reasonCategories: LostReasonCategory[] = useMemo(
    () => (lostReasonQuery.data ?? []).map((c: { key: string }) => c.key as LostReasonCategory),
    [lostReasonQuery.data]
  );

  // ─── Pagination — separate state per resource ──────────────────────────────

  const battlecardsPagination = usePaginationParams();
  const lostReasonsPagination = usePaginationParams();
  const competitorsPagination = usePaginationParams();

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: battlecards = [], error: battlecardsError } = useQuery({
    queryKey: [...queryKeys.intelligence.battlecards, battlecardsPagination.params],
    queryFn: async () => {
      const res = await intelligenceService.battlecards.getAll(battlecardsPagination.params);
      const meta = extractPaginationMeta(res);
      if (meta) battlecardsPagination.setTotal(meta.total);
      const raw = ((res as unknown as { data?: Record<string, unknown>[] }).data ?? []) as Record<
        string,
        unknown
      >[];
      return raw.map(normalizeBattlecard) as unknown as Battlecard[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const lostReasonsServerParams = {
    ...lostReasonsPagination.params,
    ...(filters.lostReasonType ? { reason_type: filters.lostReasonType } : {}),
    ...(filters.lostReasonCompetitorUid ? { competitor_uid: filters.lostReasonCompetitorUid } : {}),
  };

  const { data: lostReasons = [], error: lostReasonsError } = useQuery({
    queryKey: [...queryKeys.intelligence.lostReasons, lostReasonsServerParams],
    queryFn: async () => {
      const res = await intelligenceService.lostReasons.getAll(lostReasonsServerParams);
      const meta = extractPaginationMeta(res);
      if (meta) lostReasonsPagination.setTotal(meta.total);
      return ((res as unknown as { data?: LostReason[] }).data ?? []) as LostReason[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const { data: competitors = [], error: competitorsError } = useQuery({
    queryKey: [...queryKeys.intelligence.competitors, competitorsPagination.params],
    queryFn: async () => {
      const res = await intelligenceService.competitors.getAll(competitorsPagination.params);
      const meta = extractPaginationMeta(res);
      if (meta) competitorsPagination.setTotal(meta.total);
      return ((res as unknown as { data?: Competitor[] }).data ?? []) as Competitor[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // ─── Error toasts (React Query v5: no onError on useQuery) ─────────────────

  useEffect(() => {
    if (battlecardsError) notify.error(extractApiError(battlecardsError));
  }, [battlecardsError]);

  useEffect(() => {
    if (lostReasonsError) notify.error(extractApiError(lostReasonsError));
  }, [lostReasonsError]);

  useEffect(() => {
    if (competitorsError) notify.error(extractApiError(competitorsError));
  }, [competitorsError]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  // TODO: Backend tiene CompetitiveIntelligenceService::lostReasonsReport()
  // que devuelve summary, by_reason_type, by_competitor. Pero no existe un
  // endpoint unificado de stats para battlecards + lost reasons + competitors.
  // Evaluar crear /competitive-intelligence/stats en backend.

  const stats: IntelligenceStats = useMemo(() => {
    const avg_win_rate =
      battlecards.length > 0
        ? Math.round(
            battlecards.reduce((acc, bc) => acc + (bc.win_rate || 0), 0) / battlecards.length
          )
        : 0;

    const total_lost_amount = lostReasons.reduce((acc, d) => acc + (Number(d.deal_value) || 0), 0);

    const competitorCounts = lostReasons.reduce<Record<string, number>>((acc, d) => {
      if (d.competitor_name) {
        acc[d.competitor_name] = (acc[d.competitor_name] ?? 0) + 1;
      }
      return acc;
    }, {});
    const top_competitor =
      Object.entries(competitorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—';

    const reasonCounts = lostReasons.reduce<Record<string, number>>((acc, d) => {
      acc[d.lost_reason_category] = (acc[d.lost_reason_category] ?? 0) + 1;
      return acc;
    }, {});
    const top_lost_reason = (Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ??
      reasonCategories[0] ??
      'other') as LostReasonCategory;

    return {
      total_competitors: competitors.length,
      avg_win_rate,
      total_lost_deals: lostReasons.length,
      total_lost_amount,
      top_competitor,
      top_lost_reason,
    };
  }, [battlecards, competitors, lostReasons, reasonCategories]);

  // ─── Heatmap ───────────────────────────────────────────────────────────────

  const heatmapData: HeatmapCell[] = useMemo(() => {
    const rows: { uid: string; name: string }[] = [
      ...competitors.map((c) => ({ uid: c.uid, name: c.name })),
      { uid: 'none', name: 'Sin competidor' },
    ];

    return rows.flatMap((row) =>
      reasonCategories.map((reason) => ({
        competitor_uid: row.uid,
        competitor_name: row.name,
        reason,
        count: lostReasons.filter(
          (d) => (d.competitor_uid ?? 'none') === row.uid && d.lost_reason_category === reason
        ).length,
      }))
    );
  }, [competitors, lostReasons, reasonCategories]);

  // ─── CRUD Battlecards ──────────────────────────────────────────────────────

  const createBattlecard = async (
    data: Omit<
      Battlecard,
      | 'uid'
      | 'win_rate'
      | 'deals_tracked'
      | 'deals_won'
      | 'created_at'
      | 'updated_at'
      | 'deals_value'
    >
  ): Promise<boolean> => {
    try {
      await intelligenceService.battlecards.create(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.battlecards });
      return true;
    } catch {
      return false;
    }
  };

  const updateBattlecard = async (
    uid: string,
    changes: Partial<
      Omit<
        Battlecard,
        'uid' | 'win_rate' | 'deals_tracked' | 'deals_won' | 'created_at' | 'updated_at'
      >
    >
  ): Promise<boolean> => {
    try {
      await intelligenceService.battlecards.update(uid, changes);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.battlecards });
      return true;
    } catch {
      return false;
    }
  };

  const deleteBattlecard = async (uid: string): Promise<boolean> => {
    try {
      await intelligenceService.battlecards.delete(uid);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.battlecards });
      return true;
    } catch {
      return false;
    }
  };

  // ─── CRUD Lost Reasons ───────────────────────────────────────────────────────

  const createLostReason = async (data: Omit<LostReason, 'uid'>): Promise<boolean> => {
    try {
      await intelligenceService.lostReasons.create(data);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.lostReasons });
      return true;
    } catch {
      return false;
    }
  };

  const updateLostReason = async (
    uid: string,
    changes: Partial<Omit<LostReason, 'uid'>>
  ): Promise<boolean> => {
    try {
      await intelligenceService.lostReasons.update(uid, changes);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.lostReasons });
      return true;
    } catch {
      return false;
    }
  };

  const deleteLostReason = async (uid: string): Promise<boolean> => {
    try {
      await intelligenceService.lostReasons.delete(uid);
      queryClient.invalidateQueries({ queryKey: queryKeys.intelligence.lostReasons });
      return true;
    } catch {
      return false;
    }
  };

  return {
    battlecards,
    lostReasons,
    competitors,
    stats,
    heatmapData,
    createBattlecard,
    updateBattlecard,
    deleteBattlecard,
    createLostReason,
    updateLostReason,
    deleteLostReason,
    battlecardsPagination: {
      page: battlecardsPagination.page,
      rowsPerPage: battlecardsPagination.rowsPerPage,
      total: battlecardsPagination.total,
      search: battlecardsPagination.search,
      onChangeSearch: battlecardsPagination.onChangeSearch,
      onChangePage: battlecardsPagination.onChangePage,
      onChangeRowsPerPage: battlecardsPagination.onChangeRowsPerPage,
    },
    lostReasonsPagination: {
      page: lostReasonsPagination.page,
      rowsPerPage: lostReasonsPagination.rowsPerPage,
      total: lostReasonsPagination.total,
      search: lostReasonsPagination.search,
      onChangeSearch: lostReasonsPagination.onChangeSearch,
      onChangePage: lostReasonsPagination.onChangePage,
      onChangeRowsPerPage: lostReasonsPagination.onChangeRowsPerPage,
    },
    competitorsPagination: {
      page: competitorsPagination.page,
      rowsPerPage: competitorsPagination.rowsPerPage,
      total: competitorsPagination.total,
      onChangePage: competitorsPagination.onChangePage,
      onChangeRowsPerPage: competitorsPagination.onChangeRowsPerPage,
    },
  };
}
