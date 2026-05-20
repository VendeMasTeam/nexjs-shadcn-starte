// ─────────────────────────────────────────────────────────────────────────────
// Contacts — Domain types (snake_case, backend-aligned)
// ─────────────────────────────────────────────────────────────────────────────

export type ContactType = 'company' | 'person' | 'government';
export type ContactStatus = 'active' | 'inactive' | 'prospect';
/** @deprecated Company sizes are now dynamic via /api/tenant/company-sizes. Use string instead. */
export type CompanySize = string;

/** Relationship between two entities (contact ↔ company) */
export interface ContactRelation {
  related_uid: string;
  related_name: string;
  related_type: ContactType;
  role?: string;
}

/** Base entity — common fields for company, person, and government */
interface ContactBase {
  uid: string;
  type: ContactType;
  name: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  status: ContactStatus;
  relations?: ContactRelation[];
  created_at: string;
  custom_fields?: {
    custom_field_uid: string;
    key: string;
    label: string;
    type: string;
    value: unknown;
  }[];
}

/** Company — B2B (maps to /accounts) */
export interface Company extends ContactBase {
  type: 'company';
  tax_id?: string;
  industry?: string;
  company_size?: CompanySize;
  website?: string;
}

/** Person — B2C (maps to /contacts) */
export interface Person extends ContactBase {
  type: 'person';
  id_number?: string;
  job_title?: string;
  /** UID of the company this person belongs to */
  company_uid?: string;
  company_name?: string;
}

/** Government entity — B2G (maps to /contacts) */
export interface GovernmentEntity extends ContactBase {
  type: 'government';
  institution_type?: string;
  is_public_entity: boolean;
  bid_code?: string;
}

export type Contact = Company | Person | GovernmentEntity;

/** Payload for creating/editing — unified fields */
export interface ContactPayload {
  uid?: string;
  type: ContactType;
  name: string;
  email: string;
  phone?: string;
  country: string;
  city?: string;
  status: ContactStatus;
  // Company
  tax_id?: string;
  industry?: string;
  company_size?: CompanySize;
  website?: string;
  // Person
  id_number?: string;
  job_title?: string;
  company_uid?: string;
  // Government
  is_public_entity?: boolean;
}
