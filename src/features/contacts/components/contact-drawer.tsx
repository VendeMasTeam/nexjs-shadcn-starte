'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { customFieldsService } from 'src/features/settings/services/custom-fields.service';
import { localizationService } from 'src/features/settings/services/localization.service';
import { Button } from 'src/shared/components/ui/button';
import {
  CustomFieldsSection,
  type CustomFieldsSectionHandle,
} from 'src/shared/components/ui/custom-fields-section';
import { Icon } from 'src/shared/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { z } from 'zod';

import { contactsService } from '../services/contacts.service';
import type { Contact, ContactPayload, ContactType } from '../types/contacts.types';
import type { ContactDrawerFormData } from './contact-drawer/contact-drawer.types';
import { ContactDrawerBasicInfo } from './contact-drawer/ContactDrawerBasicInfo';
import { ContactDrawerCompanyFields } from './contact-drawer/ContactDrawerCompanyFields';
import { ContactDrawerGovernmentFields } from './contact-drawer/ContactDrawerGovernmentFields';
import { ContactDrawerPersonFields } from './contact-drawer/ContactDrawerPersonFields';
import { ContactDrawerTypeSelector } from './contact-drawer/ContactDrawerTypeSelector';

const schema = z.object({
  type: z.enum(['company', 'person', 'government']),
  name: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  country: z.string().min(1, 'Requerido'),
  city: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']),
  // Company
  tax_id: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  website: z.string().optional(),
  // Person
  id_number: z.string().optional(),
  job_title: z.string().optional(),
  company_uid: z.string().optional(),
  // Government
  is_public_entity: z.boolean().optional(),
});

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contacto: Contact | null;
  empresas: Contact[];
  onSave: (form: ContactPayload) => Promise<{ uid: string } | boolean>;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  isOpen,
  onClose,
  contacto,
  empresas,
  onSave,
}) => {
  const customFieldsRef = useRef<CustomFieldsSectionHandle>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries((contacto?.custom_fields ?? []).map((f) => [f.custom_field_uid, f.value]))
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ContactDrawerFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { type: 'company', status: 'active', is_public_entity: true },
  });

  const type = useWatch({ control, name: 'type' });
  const email = useWatch({ control, name: 'email' });
  const taxId = useWatch({ control, name: 'tax_id' });
  const country = useWatch({ control, name: 'country' });

  // Countries from backend
  const { data: countryOptions = [] } = useQuery({
    queryKey: ['settings', 'countries'],
    queryFn: async () => {
      const data = await localizationService.getCountries();
      return data.map((c) => ({ value: c.name, label: c.name }));
    },
    staleTime: 0,
  });

  // Cities filtered by selected country
  const [citySearch, setCitySearch] = useState('');
  const { data: cityOptions = [] } = useQuery({
    queryKey: ['settings', 'cities', country, citySearch],
    queryFn: async () => {
      const data = await localizationService.getCities({
        country,
        search: citySearch || undefined,
      });
      return data.map((c) => ({ value: c.name, label: c.name }));
    },
    enabled: !!country,
    staleTime: 0,
  });

  useEffect(() => {
    if (isOpen) {
      if (contacto) {
        reset({
          type: contacto.type as ContactType,
          name: contacto.name,
          email: contacto.email,
          phone: contacto.phone ?? '',
          country: contacto.country,
          city: contacto.city ?? '',
          status: contacto.status,
          tax_id: contacto.type === 'company' ? contacto.tax_id : '',
          industry: contacto.type === 'company' ? (contacto.industry ?? '') : '',
          company_size: contacto.type === 'company' ? contacto.company_size : undefined,
          website: contacto.type === 'company' ? (contacto.website ?? '') : '',
          id_number: contacto.type === 'person' ? (contacto.id_number ?? '') : '',
          job_title: contacto.type === 'person' ? (contacto.job_title ?? '') : '',
          company_uid: contacto.type === 'person' ? (contacto.company_uid ?? '') : '',
          is_public_entity: contacto.type === 'government',
        });
      } else {
        reset({ type: 'company', status: 'active', is_public_entity: true });
      }
    }
  }, [isOpen, contacto, reset]);

  const checkDuplicate = useCallback(async () => {
    if (!email || email.length < 5) return;
    const raw = await contactsService.checkDuplicate({
      email,
      tax_id: type === 'company' ? (taxId ?? null) : null,
      exclude_uid: contacto?.uid ?? null,
    });
    const data = raw as Record<string, unknown>;
    const emailDup = (data.email_duplicate as boolean) ?? false;
    const taxIdDup = (data.tax_id_duplicate as boolean) ?? false;
    if (emailDup) setDuplicateWarning('Ya existe un contacto con este email.');
    else if (taxIdDup) setDuplicateWarning('Ya existe una empresa con este NIT.');
    else setDuplicateWarning(null);
  }, [email, taxId, type, contacto?.uid]);

  useEffect(() => {
    const t = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(t);
  }, [checkDuplicate]);

  const onSubmit = async (data: ContactDrawerFormData) => {
    if (customFieldsRef.current && !customFieldsRef.current.validate()) return;
    const payload: ContactPayload = {
      type: data.type,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      country: data.country,
      city: data.city || undefined,
      status: data.status,
      tax_id: data.tax_id || undefined,
      industry: data.industry || undefined,
      company_size: data.company_size || undefined,
      website: data.website || undefined,
      id_number: data.id_number || undefined,
      job_title: data.job_title || undefined,
      company_uid: data.company_uid || undefined,
      is_public_entity: data.type === 'government',
    };
    const result = await onSave(payload);
    if (!result) return;
    const entityUid = typeof result === 'object' ? result.uid : contacto?.uid;
    if (entityUid && Object.keys(customFieldValues).length > 0) {
      const entityType = data.type === 'company' ? 'companies' : 'contacts';
      await customFieldsService.saveAll(entityUid, entityType, customFieldValues);
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[500px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <SheetTitle>{contacto ? 'Editar Contacto' : 'Nuevo Contacto'}</SheetTitle>
          <SheetDescription>
            {contacto
              ? 'Actualiza los datos del contacto'
              : 'Completa el formulario según el tipo de entidad'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-5">
            {/* Type selector */}
            <ContactDrawerTypeSelector register={register('type')} selected={type} />

            {/* Basic info */}
            <ContactDrawerBasicInfo
              control={control}
              type={type}
              countryOptions={countryOptions}
              cityOptions={cityOptions}
              onCitySearch={setCitySearch}
            />

            {/* Duplicate warning */}
            {duplicateWarning && !errors.email && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs mt-1.5">
                <Icon name="AlertTriangle" size={13} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Type-specific fields */}
            {type === 'company' && <ContactDrawerCompanyFields control={control} />}
            {type === 'person' && (
              <ContactDrawerPersonFields control={control} companies={empresas} />
            )}
            {type === 'government' && <ContactDrawerGovernmentFields control={control} />}

            {/* Custom fields */}
            <CustomFieldsSection
              ref={customFieldsRef}
              module={type === 'company' ? 'companies' : 'contacts'}
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(onSubmit)()}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : contacto ? 'Guardar cambios' : 'Crear contacto'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
