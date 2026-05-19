'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';

import { invoiceService } from '../services/invoice.service';
import type { Payment } from '../types/sales.types';

export function useInvoice(invoiceUid: string) {
  const queryClient = useQueryClient();

  const {
    data: invoice = null,
    isLoading: invLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.sales.invoices, invoiceUid],
    queryFn: () => invoiceService.getOne(invoiceUid),
    enabled: !!invoiceUid,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const { data: payments = [], isLoading: pmtLoading } = useQuery({
    queryKey: [...queryKeys.sales.invoices, invoiceUid, 'payments'],
    queryFn: () => invoiceService.getPaymentHistory(invoiceUid),
    enabled: !!invoiceUid,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const registerPaymentMutation = useMutation({
    mutationFn: (data: Partial<Payment>) => {
      if (!invoice) throw new Error('No invoice loaded');
      return invoiceService.registerPayment(invoice.uid, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.sales.invoices, invoiceUid] });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.sales.invoices, invoiceUid, 'payments'],
      });
    },
  });

  return {
    invoice,
    payments,
    isLoading: invLoading || pmtLoading,
    error: error ?? null,
    registerPayment: (data: Partial<Payment>) => registerPaymentMutation.mutateAsync(data),
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.sales.invoices, invoiceUid] });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.sales.invoices, invoiceUid, 'payments'],
      });
    },
  };
}
