'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from 'src/lib/query-keys';

import { commissionService } from '../services/commission.service';
import type { CreateFinancialRecordPayload } from '../types/commissions.types';

export const useFinancialRecords = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancialRecordPayload) =>
      commissionService.financialRecords.create(data),
    meta: { successMessage: 'Registro financiero creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.commissions.entries });
    },
  });

  return {
    isSubmitting: createMutation.isPending,
    createFinancialRecord: async (data: CreateFinancialRecordPayload) => {
      return await createMutation.mutateAsync(data);
    },
  };
};
