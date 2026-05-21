'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { queryKeys } from 'src/lib/query-keys';
import { usePaginationParams } from 'src/shared/hooks/use-pagination';
import { extractPaginationMeta } from 'src/shared/lib/pagination';

import { contactsService } from '../services/contacts.service';
import type { Contact, ContactPayload, ContactStatus, ContactType } from '../types/contacts.types';

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — maps backend response to Contact type (defense against field
// name mismatches like camelCase vs snake_case or missing optional fields)
// ─────────────────────────────────────────────────────────────────────────────
function normalizeContact(raw: Record<string, unknown>): Contact {
  const type: ContactType =
    (raw.type as string) === 'company'
      ? 'company'
      : (raw.is_public_entity as boolean) === true || (raw.type as string) === 'government'
        ? 'government'
        : 'person';

  // Contacts return first_name + last_name; accounts return name directly
  const name =
    (raw.name as string) ||
    `${(raw.first_name as string) ?? ''} ${(raw.last_name as string) ?? ''}`.trim();

  const base = {
    uid: raw.uid as string,
    type,
    name,
    email: (raw.email as string) ?? '',
    phone: raw.phone as string | undefined,
    country: (raw.country as string) ?? '',
    city: raw.city as string | undefined,
    status: (raw.status as ContactStatus) || 'active',
    relations: raw.relations as Record<string, unknown>[],
    created_at: (raw.created_at as string) ?? '',
  };

  if (type === 'company') {
    return {
      ...base,
      type: 'company' as const,
      tax_id: (raw.document as string) ?? (raw.tax_id as string) ?? undefined,
      industry: raw.industry as string | undefined,
      company_size: raw.company_size as string | undefined,
      website: raw.website as string | undefined,
    } as unknown as Contact;
  }

  if (type === 'government') {
    return {
      ...base,
      type: 'government' as const,
      institution_type: raw.institution_type as string | undefined,
      is_public_entity: (raw.is_public_entity as boolean) ?? false,
      bid_code: raw.bid_code as string | undefined,
    } as unknown as Contact;
  }

  return {
    ...base,
    type: 'person' as const,
    id_number: raw.id_number as string | undefined,
    job_title: (raw.job_title as string) ?? (raw.position as string) ?? undefined,
    company_uid: (raw.account_uid as string) ?? (raw.company_uid as string) ?? undefined,
    company_name: raw.company_name as string | undefined,
  } as unknown as Contact;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — module-level (owned by the hook, exported for component reuse)
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves which API section to use based on contact type */
const resolveApi = (type: ContactType): 'accounts' | 'contacts' =>
  type === 'company' ? 'accounts' : 'contacts';

/** Builds payload for /accounts (company — B2B) */
export function buildCompanyPayload(form: ContactPayload): Record<string, unknown> {
  return {
    name: form.name,
    document: form.tax_id, // required by backend; tax_id is accepted as alias
    email: form.email,
    phone: form.phone || undefined,
    status: form.status,
    industry: form.industry || undefined,
    website: form.website || undefined,
    address: form.address || undefined,
    // country, city, company_size ignored by backend — omitted intentionally
  };
}

/** Builds payload for /contacts (person or government — B2C/B2G) */
export function buildContactPayload(form: ContactPayload): Record<string, unknown> {
  return {
    type: form.type,
    name: form.name,
    email: form.email,
    phone: form.phone,
    country: form.country,
    city: form.city,
    status: form.status,
    id_number: form.id_number,
    job_title: form.job_title,
    company_uid: form.company_uid,
    is_public_entity: form.type === 'government',
  };
}

/** Builds the correct payload based on contact type */
export function buildPayload(form: ContactPayload): Record<string, unknown> {
  return form.type === 'company' ? buildCompanyPayload(form) : buildContactPayload(form);
}

/** Maps snake_case duplicate-check response to camelCase */
export function mapDuplicateCheckResponse(raw: Record<string, unknown>): {
  emailDuplicate: boolean;
  taxIdDuplicate: boolean;
} {
  return {
    emailDuplicate: (raw.email_duplicate as boolean) ?? false,
    taxIdDuplicate: (raw.tax_id_duplicate as boolean) ?? false,
  };
}

/**
 * Checks for duplicate email or tax_id.
 * Thin wrapper around the service — mapping happens here.
 */
export async function checkDuplicate(
  email: string,
  taxId?: string,
  excludeUid?: string
): Promise<{ emailDuplicate: boolean; taxIdDuplicate: boolean }> {
  const raw = await contactsService.checkDuplicate({
    email,
    tax_id: taxId ?? null,
    exclude_uid: excludeUid ?? null,
  });
  return mapDuplicateCheckResponse(raw as Record<string, unknown>);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useContacts(filters?: {
  search?: string;
  type?: ContactType | 'ALL';
  status?: string;
}) {
  const queryClient = useQueryClient();
  const pagination = usePaginationParams();

  const typeFilter = filters?.type ?? 'ALL';
  const searchParam = filters?.search || undefined;
  const statusParam = filters?.status && filters.status !== 'ALL' ? filters.status : undefined;

  const serverParams = {
    ...pagination.params,
    ...(searchParam ? { search: searchParam } : {}),
    ...(statusParam ? { status: statusParam } : {}),
    // Send type filter for /contacts to differentiate B2C vs B2G
    ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
  };

  // ── Merge de /accounts + /contacts ──────────────────────────────────────
  // La lógica de merge vive en el hook, no en el servicio. El servicio solo
  // llama al endpoint correcto y retorna la respuesta raw.
  // Cuando typeFilter restringe a un tipo, solo consulta el endpoint relevante.

  const needAccounts = typeFilter === 'ALL' || typeFilter === 'company';
  const needContacts =
    typeFilter === 'ALL' || typeFilter === 'person' || typeFilter === 'government';

  const { data: accountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: [...queryKeys.contacts.list, 'company', typeFilter, serverParams],
    queryFn: () => contactsService.accounts.list(serverParams),
    staleTime: 0,
    placeholderData: keepPreviousData,
    enabled: needAccounts,
  });

  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: [...queryKeys.contacts.list, 'contact', typeFilter, serverParams],
    queryFn: () => contactsService.contacts.list(serverParams),
    staleTime: 0,
    placeholderData: keepPreviousData,
    enabled: needContacts,
  });

  const companies = needAccounts
    ? (((accountsData as Record<string, unknown>)?.data ?? []) as Record<string, unknown>[]).map(
        normalizeContact
      )
    : [];
  const persons = needContacts
    ? (((contactsData as Record<string, unknown>)?.data ?? []) as Record<string, unknown>[]).map(
        normalizeContact
      )
    : [];

  // Merge both arrays
  const contactos: Contact[] = [...companies, ...persons];

  const isLoading = isLoadingAccounts || isLoadingContacts;

  // Derive pagination from accounts response (dominant endpoint for totals).
  // When accounts is disabled (e.g. type=person), fall back to contacts meta.
  const paginationSource = needAccounts ? accountsData : contactsData;
  const paginationMeta = (paginationSource as Record<string, unknown>)?.meta;
  if (paginationMeta) {
    const meta = extractPaginationMeta(paginationMeta);
    if (meta) pagination.setTotal(meta.total);
  }

  // ── Create ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (form: ContactPayload) => {
      const api = resolveApi(form.type);
      const payload = buildPayload(form);
      return contactsService[api].create(payload) as Promise<Contact>;
    },
    meta: { successMessage: 'Contacto creado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list });
    },
  });

  // ── Update ───────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async ({ uid, form }: { uid: string; form: Partial<ContactPayload> }) => {
      const api = resolveApi(form.type as ContactType);
      const payload = buildPayload(form as ContactPayload);
      return contactsService[api].update(uid, payload) as Promise<Contact>;
    },
    meta: { successMessage: 'Contacto actualizado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list });
    },
  });

  // ── Delete — resolves type from cached data ────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (uid: string) => {
      // Look up the contact in the merged list to determine its type
      const found = contactos.find((c) => c.uid === uid);
      const api = found ? resolveApi(found.type) : 'contacts';
      // TODO: if found is undefined (race condition / cache miss),
      // we can't reliably know the endpoint. Consider passing type
      // from the caller if this becomes an issue.
      await contactsService[api].delete(uid);
    },
    meta: { successMessage: 'Contacto eliminado correctamente' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list });
    },
  });

  // ── Relations — add (already thin) ──────────────────────────────────────

  const addRelacionMutation = useMutation({
    mutationFn: ({ aId, bId, role }: { aId: string; bId: string; role?: string }) =>
      contactsService.addRelacion(aId, bId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list });
    },
  });

  // ── Relations — remove (POST /relations/remove) ───────────────────────

  const removeRelacionMutation = useMutation({
    mutationFn: async ({ aId, bId }: { aId: string; bId: string }) => {
      await axiosInstance.post(endpoints.relations.remove, {
        parent_uid: aId,
        child_uid: bId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list });
    },
  });

  // ── Public API wrappers ─────────────────────────────────────────────────

  const createContacto = async (form: ContactPayload): Promise<{ uid: string }> => {
    const contact = await createMutation.mutateAsync(form);
    return { uid: contact.uid };
  };

  const updateContacto = async (uid: string, form: Partial<ContactPayload>): Promise<boolean> => {
    await updateMutation.mutateAsync({ uid, form });
    return true;
  };

  const addRelacion = async (aId: string, bId: string, role?: string): Promise<void> => {
    await addRelacionMutation.mutateAsync({ aId, bId, role });
  };

  const removeRelacion = async (aId: string, bId: string): Promise<void> => {
    await removeRelacionMutation.mutateAsync({ aId, bId });
  };

  const deleteContacto = async (uid: string): Promise<void> => {
    await deleteMutation.mutateAsync(uid);
  };

  return {
    contactos,
    isLoading,
    createContacto,
    updateContacto,
    addRelacion,
    removeRelacion,
    deleteContacto,
    checkDuplicate,
    refetch: () => queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list }),
    pagination: {
      page: pagination.page,
      rowsPerPage: pagination.rowsPerPage,
      total: pagination.total,
      onChangePage: pagination.onChangePage,
      onChangeRowsPerPage: pagination.onChangeRowsPerPage,
    },
  };
}
