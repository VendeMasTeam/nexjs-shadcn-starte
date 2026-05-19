'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { partnersService } from '../services/partners.service';
import type {
  Partner,
  PartnerOpportunity,
  PartnerOpportunityPayload,
  PartnerPayload,
  PortalMaterial,
} from '../types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface PartnersFilters {
  partnerType?: string;
  partnerStatus?: string;
  oppStatus?: string;
  oppPartnerUid?: string;
}

export function usePartners(filters: PartnersFilters = {}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();
  const oppPagination = usePaginationParams();
  const materialPagination = usePaginationParams();

  // ── Partner server-side filters merged with pagination ─────────────────
  const partnerServerParams = {
    ...pagination.params,
    ...(filters.partnerType ? { type: filters.partnerType } : {}),
    ...(filters.partnerStatus ? { status: filters.partnerStatus } : {}),
  };

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: [...queryKeys.partners.partners.list, partnerServerParams],
    queryFn: async () => {
      const res = await partnersService.partners.list(partnerServerParams);
      const meta = extractPaginationMeta(res as Record<string, unknown>);
      if (meta) pagination.setTotal(meta.total);
      return ((res as Record<string, unknown>).data ?? []) as Partner[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // Opportunity server-side filters with separate pagination
  const oppServerParams = {
    ...oppPagination.params,
    ...(filters.oppStatus ? { status: filters.oppStatus } : {}),
    ...(filters.oppPartnerUid ? { partner_uid: filters.oppPartnerUid } : {}),
  };

  const { data: opportunities = [], isLoading: loadingOpportunities } = useQuery({
    queryKey: [...queryKeys.partners.opportunities.list, oppServerParams],
    queryFn: async () => {
      const res = await partnersService.opportunities.list(
        Object.keys(oppServerParams).length > 0 ? oppServerParams : undefined
      );
      const meta = extractPaginationMeta(res as unknown as Record<string, unknown>);
      if (meta) oppPagination.setTotal(meta.total);
      return res as unknown as PartnerOpportunity[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: [...queryKeys.partners.materials.list, materialPagination.params],
    queryFn: async () => {
      const res = await partnersService.materials.list(materialPagination.params);
      const meta = extractPaginationMeta(res as unknown as Record<string, unknown>);
      if (meta) materialPagination.setTotal(meta.total);
      return res as unknown as PortalMaterial[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  // ── Stats (computed client-side) ────────────────────────────────────────
  // El backend soporta ?with=stats que devuelve { partners, stats, pagination }
  // con keys: total_partners, active_partners, prospect_partners,
  // pending_opportunities, converted_deals, total_materials.
  // Requiere cambiar el response format del fetch principal para no duplicar.
  // Mientras tanto, cálculo client-side es suficiente.

  const partnerStats = useMemo(() => {
    const active = partners.filter((p) => p.status === 'active').length;
    const prospects = partners.filter((p) => p.status === 'prospect').length;
    const pendingOpps = opportunities.filter((o) => o.status === 'pending').length;
    const convertedDeals = partners.reduce((acc, p) => acc + p.converted_deals, 0);
    return { active, prospects, pendingOpps, convertedDeals };
  }, [partners, opportunities]);

  const opportunityStats = useMemo(() => {
    // TODO: Backend no tiene endpoint de stats para oportunidades.
    const pending = opportunities.filter((o) => o.status === 'pending').length;
    const validated = opportunities.filter((o) => o.status === 'validated').length;
    const closed = opportunities.filter((o) => o.status === 'closed').length;
    const won = opportunities.filter((o) => o.status === 'won').length;
    return { pending, validated, closed, won };
  }, [opportunities]);

  const materialStats = useMemo(() => {
    // TODO: Backend PartnerResourceService no tiene endpoint de stats.
    const total = materials.length;
    const totalDownloads = materials.reduce((acc, m) => acc + m.download_count, 0);
    const lastUpdated =
      materials.length > 0
        ? materials.reduce((latest, m) => (m.uploaded_at > latest.uploaded_at ? m : latest))
            .uploaded_at
        : '—';
    return { total, totalDownloads, lastUpdated };
  }, [materials]);

  // ── Partners mutations ──────────────────────────────────────────────────

  const createPartnerMutation = useMutation({
    mutationFn: (data: PartnerPayload) => partnersService.partners.create(data),
    meta: { successMessage: 'Partner creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<PartnerPayload> }) =>
      partnersService.partners.update(uid, data),
    meta: { successMessage: 'Partner actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const removePartnerMutation = useMutation({
    mutationFn: (uid: string) => partnersService.partners.remove(uid),
    meta: { successMessage: 'Partner eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const createPartner = async (data: PartnerPayload): Promise<boolean> => {
    await createPartnerMutation.mutateAsync(data);
    return true;
  };

  const updatePartner = async (uid: string, data: Partial<PartnerPayload>): Promise<boolean> => {
    await updatePartnerMutation.mutateAsync({ uid, data });
    return true;
  };

  const removePartner = async (uid: string): Promise<boolean> => {
    await removePartnerMutation.mutateAsync(uid);
    return true;
  };

  // ── Opportunities mutations ─────────────────────────────────────────────

  const createOpportunityMutation = useMutation({
    mutationFn: (data: PartnerOpportunityPayload) => partnersService.opportunities.create(data),
    meta: { successMessage: 'Oportunidad creada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<PartnerOpportunityPayload> }) =>
      partnersService.opportunities.update(uid, data),
    meta: { successMessage: 'Oportunidad actualizada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const approveOpportunityMutation = useMutation({
    mutationFn: (uid: string) => partnersService.opportunities.approve(uid),
    meta: { successMessage: 'Oportunidad aprobada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const rejectOpportunityMutation = useMutation({
    mutationFn: (uid: string) => partnersService.opportunities.reject(uid),
    meta: { successMessage: 'Oportunidad rechazada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const convertOpportunityMutation = useMutation({
    mutationFn: (uid: string) => partnersService.opportunities.convert(uid),
    meta: { successMessage: 'Oportunidad convertida correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const removeOpportunityMutation = useMutation({
    mutationFn: (uid: string) => partnersService.opportunities.remove(uid),
    meta: { successMessage: 'Oportunidad eliminada correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.opportunities.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.partners.list });
    },
  });

  const createOpportunity = async (data: PartnerOpportunityPayload): Promise<boolean> => {
    await createOpportunityMutation.mutateAsync(data);
    return true;
  };

  const updateOpportunity = async (
    uid: string,
    data: Partial<PartnerOpportunityPayload>
  ): Promise<boolean> => {
    await updateOpportunityMutation.mutateAsync({ uid, data });
    return true;
  };

  const approveOpportunity = async (uid: string): Promise<boolean> => {
    await approveOpportunityMutation.mutateAsync(uid);
    return true;
  };

  const rejectOpportunity = async (uid: string): Promise<boolean> => {
    await rejectOpportunityMutation.mutateAsync(uid);
    return true;
  };

  const convertOpportunity = async (uid: string): Promise<boolean> => {
    await convertOpportunityMutation.mutateAsync(uid);
    return true;
  };

  const removeOpportunity = async (uid: string): Promise<boolean> => {
    await removeOpportunityMutation.mutateAsync(uid);
    return true;
  };

  // ── Materials mutations ─────────────────────────────────────────────────

  const createMaterialMutation = useMutation({
    mutationFn: (data: FormData) => partnersService.materials.create(data),
    meta: { successMessage: 'Material creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.materials.list });
    },
  });

  const removeMaterialMutation = useMutation({
    mutationFn: (uid: string) => partnersService.materials.remove(uid),
    meta: { successMessage: 'Material eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.materials.list });
    },
  });

  const createMaterial = async (data: FormData): Promise<boolean> => {
    await createMaterialMutation.mutateAsync(data);
    return true;
  };

  const removeMaterial = async (uid: string): Promise<boolean> => {
    await removeMaterialMutation.mutateAsync(uid);
    return true;
  };

  // ── Return ──────────────────────────────────────────────────────────────

  return {
    partners,
    opportunities,
    materials,
    loadingPartners,
    loadingOpportunities,
    loadingMaterials,
    partnerStats,
    opportunityStats,
    materialStats,
    createPartner,
    updatePartner,
    removePartner,
    createOpportunity,
    updateOpportunity,
    approveOpportunity,
    rejectOpportunity,
    convertOpportunity,
    removeOpportunity,
    createMaterial,
    removeMaterial,
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      search: pagination.search,
      onChangeSearch: pagination.onChangeSearch,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
    oppPagination: {
      page: oppPagination.page,
      rowsPerPage: oppPagination.rowsPerPage,
      total: oppPagination.total,
      search: oppPagination.search,
      onChangeSearch: oppPagination.onChangeSearch,
      onChangePage: oppPagination.onChangePage,
      onChangeRowsPerPage: oppPagination.onChangeRowsPerPage,
    },
    materialPagination: {
      page: materialPagination.page,
      rowsPerPage: materialPagination.rowsPerPage,
      total: materialPagination.total,
      search: materialPagination.search,
      onChangeSearch: materialPagination.onChangeSearch,
      onChangePage: materialPagination.onChangePage,
      onChangeRowsPerPage: materialPagination.onChangeRowsPerPage,
    },
  };
}
