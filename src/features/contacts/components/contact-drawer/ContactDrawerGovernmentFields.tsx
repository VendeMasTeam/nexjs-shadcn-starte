'use client';

import { type Control, Controller } from 'react-hook-form';
import { Checkbox } from 'src/shared/components/ui/checkbox';

import type { ContactDrawerFormData } from './contact-drawer.types';

interface ContactDrawerGovernmentFieldsProps {
  control: Control<ContactDrawerFormData>;
}

export function ContactDrawerGovernmentFields({ control }: ContactDrawerGovernmentFieldsProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-border/40">
      <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
        Datos de Institución
      </h3>
      <Controller
        control={control}
        name="is_public_entity"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Checkbox
              id="is_public_entity"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
            <label htmlFor="is_public_entity" className="text-sm font-medium cursor-pointer">
              Entidad del sector público
            </label>
          </div>
        )}
      />
    </div>
  );
}
