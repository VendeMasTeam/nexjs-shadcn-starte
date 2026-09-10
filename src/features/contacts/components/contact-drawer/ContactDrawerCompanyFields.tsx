'use client';

import { useMemo } from 'react';
import type { Control } from 'react-hook-form';
import { FormInput } from 'src/shared/components/ui/form-input';
import { FormSelectField } from 'src/shared/components/ui/form-select-field';
import { useCompanySizes } from 'src/shared/hooks/useTenantOptions';

import type { ContactDrawerFormData } from './contact-drawer.types';

interface ContactDrawerCompanyFieldsProps {
  control: Control<ContactDrawerFormData>;
}

export function ContactDrawerCompanyFields({ control }: ContactDrawerCompanyFieldsProps) {
  const companySizes = useCompanySizes();

  const sizeOptions = useMemo(() => {
    const data = companySizes.data as { uid: string; name: string }[] | undefined;
    if (!data || data.length === 0) {
      return [{ value: '', label: 'Cargando...' }];
    }
    return [
      { value: '', label: 'Sin especificar' },
      ...data.map((opt) => ({ value: opt.uid, label: opt.name })),
    ];
  }, [companySizes.data]);

  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
        Datos de Empresa
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <FormInput control={control} name="tax_id" label="NIT / RUT" placeholder="900.123.456-7" />
        <FormInput control={control} name="industry" label="Sector" placeholder="Tecnología" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelectField
          control={control}
          name="company_size"
          label="Tamaño"
          options={sizeOptions}
        />
        <FormInput
          control={control}
          name="website"
          label="Sitio web"
          placeholder="https://empresa.com"
        />
      </div>
    </div>
  );
}
