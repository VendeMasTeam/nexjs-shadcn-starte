'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentTypeService } from 'src/features/settings/services/document-type.service';
import type {
  DocumentType,
  DocumentTypePayload,
} from 'src/features/settings/types/document-type.types';

const BASE_KEY = ['settings', 'document-types'] as const;

const EMPTY: DocumentType[] = [];

export function useDocumentTypes(filters?: { search?: string }) {
  const queryClient = useQueryClient();

  const queryKey = [...BASE_KEY, filters?.search ?? ''] as const;

  const {
    data: documentTypes = EMPTY,
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: () =>
      documentTypeService.list(filters?.search ? { search: filters.search } : undefined),
  });

  const createDocumentType = useMutation({
    mutationFn: (payload: DocumentTypePayload) => documentTypeService.create(payload),
    meta: { successMessage: 'Tipo de documento creado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const updateDocumentType = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: Partial<DocumentTypePayload> }) =>
      documentTypeService.update(uid, payload),
    meta: { successMessage: 'Tipo de documento actualizado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  const deleteDocumentType = useMutation({
    mutationFn: (uid: string) => documentTypeService.delete(uid),
    meta: { successMessage: 'Tipo de documento eliminado' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BASE_KEY });
    },
  });

  return {
    documentTypes,
    isLoading,
    isError,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
  };
}
