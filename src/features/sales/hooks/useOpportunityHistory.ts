'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { opportunityService } from 'src/features/sales/services/opportunity.service';
import type { Opportunity } from 'src/features/sales/types/sales.types';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

const EMPTY: Opportunity[] = [];

export interface OpportunityHistoryFilters {
  stage_uid?: string;
  origin?: string;
  status?: 'active' | 'open' | 'closed' | 'won' | 'lost';
  created_from?: string;
  created_to?: string;
  closed_from?: string;
  closed_to?: string;
}

export function useOpportunityHistory(filters: OpportunityHistoryFilters = {}) {
  const pagination = usePaginationParams();

  const queryParams = {
    ...pagination.params,
    ...filters,
  };

  const { data: rawData, isLoading } = useQuery({
    queryKey: [...queryKeys.sales.opportunityHistory, queryParams],
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await opportunityService.getHistory(queryParams);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return res;
    },
  });

  const items: Opportunity[] =
    ((rawData as Record<string, unknown>)?.data as Opportunity[]) ?? EMPTY;

  return {
    items,
    isLoading,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      search: pagination.search ?? '',
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
      onChangeSearch: pagination.onChangeSearch,
    },
  };
}
