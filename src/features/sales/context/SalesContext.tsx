'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { invoiceService } from '../services/invoice.service';
import { opportunityService } from '../services/opportunity.service';
import { quotationService } from '../services/quotation.service';
import type { Invoice, Opportunity, Payment, Quotation } from '../types/sales.types';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface SalesContextValue {
  opportunities: Opportunity[];
  quotations: Quotation[];
  invoices: Invoice[];
  isLoading: boolean;
  error: Error | null;

  addOpportunity: (data: Partial<Opportunity>) => Promise<Opportunity>;
  updateOpportunity: (uid: string, data: Partial<Opportunity>) => Promise<Opportunity>;
  moveOpportunity: (uid: string, stageUid: string) => Promise<void>;
  reorderOpportunities: (stageUid: string, orderedUids: string[]) => Promise<void>;

  saveQuotation: (data: Partial<Quotation>) => Promise<unknown>;
  convertQuotationToInvoice: (quotationUid: string) => Promise<Invoice>;

  registerPayment: (invoiceUid: string, data: Partial<Payment>) => Promise<void>;

  refreshOpportunities: () => Promise<void>;
  refreshQuotations: () => Promise<void>;
  refreshInvoices: () => Promise<void>;

  /** Quotations server-side filters */
  quotationSearch: string;
  onChangeQuotationSearch: (search: string) => void;
  quotationStatus: string;
  onChangeQuotationStatus: (status: string) => void;
  quotationsPagination: {
    page: number;
    rowsPerPage: number;
    total: number;
    onChangePage: (page: number) => void;
    onChangeRowsPerPage: (size: number) => void;
  };
  /** Invoices server-side filters */
  invoiceSearch: string;
  onChangeInvoiceSearch: (search: string) => void;
  invoiceStatus: string;
  onChangeInvoiceStatus: (status: string) => void;
  invoicesPagination: {
    page: number;
    rowsPerPage: number;
    total: number;
    onChangePage: (page: number) => void;
    onChangeRowsPerPage: (size: number) => void;
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SalesContext = createContext<SalesContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SalesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const quotationsPagination = usePaginationParams();
  const invoicesPagination = usePaginationParams();

  // Server-side filter state — status is NOT part of PaginationParams
  const [quotationStatus, setQuotationStatus] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');

  const {
    data: opportunities = [],
    isLoading: oppsLoading,
    error: oppsError,
  } = useQuery({
    queryKey: queryKeys.sales.opportunityList,
    queryFn: async () => {
      const res = await opportunityService.getList();
      return (res as unknown as { data?: Opportunity[] }).data ?? [];
    },
    staleTime: 0,
  });

  // Merge server-side status filter with pagination params (which already includes search)
  const quotationQueryParams = {
    ...quotationsPagination.params,
    ...(quotationStatus ? { status: quotationStatus } : {}),
  };

  const { data: quotations = [], isLoading: quotesLoading } = useQuery({
    queryKey: [...queryKeys.sales.quotations, quotationQueryParams],
    queryFn: async () => {
      const res = await quotationService.getList(quotationQueryParams);
      const meta = extractPaginationMeta(res as unknown as Record<string, unknown>);
      if (meta) quotationsPagination.setTotal(meta.total);
      return ((res as unknown as { data?: Quotation[] }).data ?? []) as Quotation[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // Merge server-side status filter with pagination params
  const invoiceQueryParams = {
    ...invoicesPagination.params,
    ...(invoiceStatus ? { status: invoiceStatus } : {}),
  };

  const { data: invoices = [], isLoading: invsLoading } = useQuery({
    queryKey: [...queryKeys.sales.invoices, invoiceQueryParams],
    queryFn: async () => {
      const res = await invoiceService.getList(invoiceQueryParams);
      const meta = extractPaginationMeta(res as unknown as Record<string, unknown>);
      if (meta) invoicesPagination.setTotal(meta.total);
      return ((res as unknown as { data?: Invoice[] }).data ?? []) as Invoice[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const isLoading = oppsLoading || quotesLoading || invsLoading;
  const error = (oppsError ?? null) as Error | null;

  // ─── Refresh helpers ────────────────────────────────────────────────────────

  const refreshOpportunities = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['sales', 'opportunities'] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.sales.board });
    await queryClient.invalidateQueries({ queryKey: queryKeys.sales.stages });
  }, [queryClient]);

  const refreshQuotations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sales.quotations });
  }, [queryClient]);

  const refreshInvoices = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sales.invoices });
  }, [queryClient]);

  // ─── Opportunity mutations ──────────────────────────────────────────────────

  const addOpportunity = useCallback(
    async (data: Partial<Opportunity>): Promise<Opportunity> => {
      try {
        const created = await opportunityService.create(data);
        await refreshOpportunities();
        return created;
      } catch (error) {
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [refreshOpportunities]
  );

  const updateOpportunity = useCallback(
    async (uid: string, data: Partial<Opportunity>): Promise<Opportunity> => {
      try {
        const updated = await opportunityService.update(uid, data);
        refreshOpportunities(); // fire and forget — board updates in background
        return updated;
      } catch (error) {
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [refreshOpportunities]
  );

  const moveOpportunity = useCallback(
    async (uid: string, stageUid: string) => {
      // Move card instantly in the cache — user sees it immediately
      queryClient.setQueriesData(
        { queryKey: queryKeys.sales.board, exact: false },
        (old: Opportunity[] | undefined) => {
          if (!Array.isArray(old)) return old;
          return old.map((opp) => (opp.uid === uid ? { ...opp, stage_uid: stageUid } : opp));
        }
      );
      try {
        await opportunityService.update(uid, { stage_uid: stageUid });
        await refreshOpportunities();
      } catch (error) {
        // Revert on failure
        await refreshOpportunities();
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [queryClient, refreshOpportunities]
  );

  const reorderOpportunities = useCallback(
    async (stageUid: string, orderedUids: string[]) => {
      // Optimista: reasignar kanban_position según el nuevo orden antes de que
      // responda el backend — el usuario ve el cambio al instante.
      queryClient.setQueriesData(
        { queryKey: queryKeys.sales.board, exact: false },
        (old: Opportunity[] | undefined) => {
          if (!Array.isArray(old)) return old;
          const positionByUid = new Map(orderedUids.map((uid, i) => [uid, i]));
          return old.map((opp) =>
            positionByUid.has(opp.uid)
              ? { ...opp, kanban_position: positionByUid.get(opp.uid) }
              : opp
          );
        }
      );
      try {
        await opportunityService.reorderBoard(stageUid, orderedUids);
      } catch (error) {
        // Revertir trayendo el orden real del backend
        await refreshOpportunities();
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [queryClient, refreshOpportunities]
  );

  // ─── Quotation mutations ────────────────────────────────────────────────────

  const saveQuotation = useCallback(
    async (data: Partial<Quotation>): Promise<unknown> => {
      try {
        let result;
        if ((data as Quotation).uid) {
          result = await quotationService.update((data as Quotation).uid, data);
        } else {
          result = await quotationService.create(data);
        }
        await refreshQuotations();
        return result;
      } catch (error) {
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [refreshQuotations]
  );

  const convertQuotationToInvoice = useCallback(
    async (quotationUid: string): Promise<Invoice> => {
      try {
        const quotation = quotations.find((q) => q.uid === quotationUid);
        if (!quotation) throw new Error('Cotización no encontrada');
        const created = (await invoiceService.create({
          quotation_uid: quotationUid,
          currency: quotation.currency,
        } as Partial<Invoice>)) as Invoice;
        await refreshInvoices();
        // La cotización pasa a `invoiced` en backend al crear la factura — refrescar
        // para que la UI deje de mostrar su estado anterior (draft/sent/approved).
        await refreshQuotations();
        await refreshOpportunities();
        return created;
      } catch (error) {
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [quotations, refreshInvoices, refreshQuotations, refreshOpportunities]
  );

  // ─── Invoice mutations ──────────────────────────────────────────────────────

  const registerPayment = useCallback(
    async (invoiceUid: string, data: Partial<Payment>) => {
      try {
        await invoiceService.registerPayment(invoiceUid, data);
        await refreshInvoices();
      } catch (error) {
        notify.error(extractApiError(error));
        throw error;
      }
    },
    [refreshInvoices]
  );

  return (
    <SalesContext.Provider
      value={{
        opportunities,
        quotations,
        invoices,
        isLoading,
        error,
        addOpportunity,
        updateOpportunity,
        moveOpportunity,
        reorderOpportunities,
        saveQuotation,
        convertQuotationToInvoice,
        registerPayment,
        refreshOpportunities,
        refreshQuotations,
        refreshInvoices,
        quotationSearch: quotationsPagination.search ?? '',
        onChangeQuotationSearch: quotationsPagination.onChangeSearch,
        quotationStatus,
        onChangeQuotationStatus: setQuotationStatus,
        quotationsPagination: {
          page: quotationsPagination.page,
          rowsPerPage: quotationsPagination.rowsPerPage,
          total: quotationsPagination.total,
          onChangePage: quotationsPagination.onChangePage,
          onChangeRowsPerPage: quotationsPagination.onChangeRowsPerPage,
        },
        invoiceSearch: invoicesPagination.search ?? '',
        onChangeInvoiceSearch: invoicesPagination.onChangeSearch,
        invoiceStatus,
        onChangeInvoiceStatus: setInvoiceStatus,
        invoicesPagination: {
          page: invoicesPagination.page,
          rowsPerPage: invoicesPagination.rowsPerPage,
          total: invoicesPagination.total,
          onChangePage: invoicesPagination.onChangePage,
          onChangeRowsPerPage: invoicesPagination.onChangeRowsPerPage,
        },
      }}
    >
      {children}
    </SalesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSalesContext(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSalesContext must be used within SalesProvider');
  return ctx;
}
