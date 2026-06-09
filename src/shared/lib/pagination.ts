// ─────────────────────────────────────────────────────────────────────────────
// Pagination — Tipos y utilidades centralizadas
//
// Contrato del backend (ApiIndex::paginateOrGet):
//   meta.pagination = { current_page, per_page, total, last_page, from, to, has_more_pages }
// ─────────────────────────────────────────────────────────────────────────────

/** Metadata de paginación tal como la envía el backend */
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
  has_more_pages: boolean;
}

/** Parámetros que el frontend envía al backend */
export interface PaginationParams {
  page: number;
  per_page: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

/** Valores por defecto — usados por usePaginationParams() */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 10;
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Construye los query params de paginación para el backend.
 * Usar en los queryFn de TanStack Query.
 *
 * @example
 * queryFn: () => axiosInstance.get(`/api/users?${buildPaginationParams({ page: 1, per_page: 25 })}`)
 */
export function buildPaginationParams(params: Partial<PaginationParams>): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  if (params.per_page && params.per_page !== DEFAULT_PER_PAGE)
    sp.set('per_page', String(params.per_page));
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  if (params.search) sp.set('search', params.search);
  return sp;
}

/**
 * Extrae el meta de paginación de una respuesta del backend.
 * El backend envía: { success, data, meta: { pagination: {...} } }
 * Axios lo resuelve como res.data.meta.pagination
 */
export function extractPaginationMeta(response: unknown): PaginationMeta | null {
  const data = response as Record<string, unknown> | undefined;
  const meta = data?.meta as Record<string, unknown> | undefined;
  const pagination = meta?.pagination as PaginationMeta | undefined;
  if (pagination && typeof pagination.total === 'number') return pagination;
  return null;
}
