'use client';

import { useQuery } from '@tanstack/react-query';
import axiosInstance, { endpoints } from 'src/lib/axios';

import type {
  CustomField,
  CustomFieldModule,
} from '../../../features/settings/types/settings.types';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { SelectField } from './select-field';

interface Props {
  module: CustomFieldModule;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <Checkbox
          id={field.uid}
          checked={!!value}
          onCheckedChange={(checked) => onChange(!!checked)}
        />
        <label htmlFor={field.uid} className="text-sm font-medium cursor-pointer">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      </div>
    );
  }

  if (field.type === 'select' && field.select_options) {
    const options = field.select_options.map((v) => ({ value: v, label: v }));
    return (
      <SelectField
        label={field.label}
        required={field.required}
        value={(value as string) ?? ''}
        onChange={(v) => onChange(v)}
        options={options}
        placeholder="Seleccionar..."
      />
    );
  }

  return (
    <Input
      label={field.label}
      required={field.required}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Ingresá ${field.label.toLowerCase()}`}
    />
  );
}

export function CustomFieldsSection({ module, values, onChange }: Props) {
  const { data: fields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ['custom-fields-for-module', module],
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.settings.customFields.list, {
        params: { module, per_page: 100 },
      });
      return (res.data?.data ?? []) as CustomField[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || fields.length === 0) return null;

  const handleChange = (fieldUid: string, value: unknown) => {
    onChange({ ...values, [fieldUid]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
        Campos Personalizados
      </h3>
      <div className="space-y-3">
        {fields.map((field) => (
          <FieldInput
            key={field.uid}
            field={field}
            value={values[field.uid]}
            onChange={(v) => handleChange(field.uid, v)}
          />
        ))}
      </div>
    </div>
  );
}
