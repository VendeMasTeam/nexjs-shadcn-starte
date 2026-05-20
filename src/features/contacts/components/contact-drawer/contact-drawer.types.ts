import type { ContactStatus, ContactType } from '../../types/contacts.types';

export interface ContactDrawerFormData {
  type: ContactType;
  name: string;
  email: string;
  phone?: string | undefined;
  country: string;
  city?: string | undefined;
  status: ContactStatus;
  // Company
  tax_id?: string | undefined;
  industry?: string | undefined;
  company_size?: string | undefined;
  website?: string | undefined;
  // Person
  id_number?: string | undefined;
  job_title?: string | undefined;
  company_uid?: string | undefined;
  // Government
  is_public_entity?: boolean | undefined;
}
