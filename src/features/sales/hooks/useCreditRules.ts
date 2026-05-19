'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';

import type { CreateCreditExceptionPayload } from '../services/finance.service';
import { financeService } from '../services/finance.service';
import type { CreditRuleSettings } from '../types/sales.types';

// NOTE: Backend should return system defaults when no rules configured.
// See required-backend-v2/GAP-07
export function useCreditRules() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: queryKeys.sales.creditRules,
    queryFn: () => financeService.getCreditRules(),
    staleTime: 0,
  });

  const { data: exceptions = [], isLoading: excLoading } = useQuery({
    queryKey: queryKeys.sales.creditExceptions,
    queryFn: () => financeService.listCreditExceptions(),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const { mutateAsync: saveRulesMutation } = useMutation({
    mutationFn: (data: CreditRuleSettings) => financeService.saveCreditRules(data),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditRules });
    },
  });

  const saveRules = async (data: CreditRuleSettings) => {
    await saveRulesMutation(data);
  };

  const createExceptionMutation = useMutation({
    mutationFn: (data: CreateCreditExceptionPayload) => financeService.createCreditException(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditExceptions });
    },
  });

  const updateExceptionMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<CreateCreditExceptionPayload> }) =>
      financeService.updateCreditException(uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditExceptions });
    },
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: (uid: string) => financeService.deleteCreditException(uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditExceptions });
    },
  });

  const createException = async (data: CreateCreditExceptionPayload) => {
    await createExceptionMutation.mutateAsync(data);
  };

  const updateException = async (uid: string, data: Partial<CreateCreditExceptionPayload>) => {
    await updateExceptionMutation.mutateAsync({ uid, data });
  };

  const deleteException = async (uid: string) => {
    await deleteExceptionMutation.mutateAsync(uid);
  };

  return {
    rules,
    exceptions,
    isLoading: rulesLoading || excLoading,
    saveRules,
    createException,
    updateException,
    deleteException,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditRules });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.creditExceptions });
    },
  };
}
