'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { FormInput } from 'src/shared/components/ui/form-input';
import { FormSelectField } from 'src/shared/components/ui/form-select-field';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { z } from 'zod';

import type {
  CustomField,
  CustomFieldCreatePayload,
  CustomFieldModule,
  CustomFieldType,
} from '../../types/settings.types';

const schema = z.object({
  label: z.string().min(2, 'Requerido'),
  type: z.enum(['text', 'number', 'date', 'select', 'boolean']),
  module: z.string().min(1, 'Requerido'),
  required: z.boolean(),
});

type FieldForm = z.infer<typeof schema>;

interface CustomFieldDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  field: CustomField | null;
  onSave: (data: CustomFieldCreatePayload) => Promise<boolean>;
}

const TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Lista de opciones' },
  { value: 'boolean', label: 'Sí / No' },
];

const MODULE_OPTIONS_FALLBACK = [
  { value: 'contacts', label: 'Contactos' },
  { value: 'companies', label: 'Empresas' },
  { value: 'opportunities', label: 'Oportunidades' },
  { value: 'products', label: 'Productos' },
];

export const CustomFieldDrawer: React.FC<CustomFieldDrawerProps> = ({
  isOpen,
  onClose,
  field,
  onSave,
}) => {
  const [selectOptions, setSelectOptions] = useState<string[]>(() => field?.select_options ?? []);
  const [newOption, setNewOption] = useState('');

  const { data: moduleOptions = MODULE_OPTIONS_FALLBACK } = useQuery({
    queryKey: ['custom-fields-modules'],
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.settings.customFields.modules);
      return (res.data?.data ?? res.data) as { value: string; label: string }[];
    },
    staleTime: 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting },
  } = useForm<FieldForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { type: 'text', module: 'contacts', required: false },
  });

  const typeWatched = useWatch({ control, name: 'type' });

  useEffect(() => {
    if (isOpen) {
      if (field) {
        reset({
          label: field.label,
          type: field.type,
          module: field.module,
          required: field.required,
        });
      } else {
        reset({ label: '', type: 'text', module: 'contacts', required: false });
      }
    }
  }, [isOpen, field, reset]);

  const onSubmit = async (data: FieldForm) => {
    const payload: CustomFieldCreatePayload = {
      label: data.label,
      module: data.module as CustomFieldModule,
      type: data.type as CustomFieldType,
      required: data.required,
      options:
        data.type === 'select' && selectOptions.length > 0 ? { values: selectOptions } : undefined,
    };
    const success = await onSave(payload);
    if (success) onClose();
  };

  const addOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !selectOptions.includes(trimmed)) {
      setSelectOptions((prev) => [...prev, trimmed]);
      setNewOption('');
    }
  };

  return (
    <Sheet key={field?.uid ?? 'new'} open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[440px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <SheetTitle>{field ? 'Editar Campo' : 'Nuevo Campo Personalizado'}</SheetTitle>
          <SheetDescription>Define el campo que se mostrará en el módulo</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-5">
            <FormInput
              control={control}
              name="label"
              label="Etiqueta (visible al usuario)"
              required
              placeholder="Ej. Código de Licitación"
            />

            <div className="grid grid-cols-2 gap-4">
              <FormSelectField
                control={control}
                name="type"
                label="Tipo de dato"
                required
                options={TYPE_OPTIONS}
              />
              <FormSelectField
                control={control}
                name="module"
                label="Módulo"
                required
                options={moduleOptions}
              />
            </div>

            <Controller
              control={control}
              name="required"
              render={({ field: rf }) => (
                <div className="flex items-center gap-3">
                  <Checkbox id="required" checked={rf.value} onCheckedChange={rf.onChange} />
                  <label htmlFor="required" className="text-sm font-medium cursor-pointer">
                    Campo requerido
                  </label>
                </div>
              )}
            />

            {typeWatched === 'select' && (
              <div className="space-y-3 bg-muted/40 p-4 rounded-lg border border-border/40">
                <h4 className="text-sm font-semibold text-foreground">Opciones de la lista</h4>
                {selectOptions.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectOptions.map((op) => (
                      <div
                        key={op}
                        className="flex items-center justify-between gap-2 bg-background px-3 py-2 rounded border border-border/40 text-sm"
                      >
                        <span>{op}</span>
                        <button
                          type="button"
                          onClick={() => setSelectOptions((prev) => prev.filter((o) => o !== op))}
                          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin opciones todavía.</p>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      placeholder="Ej. VIP"
                      size="sm"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addOption}
                    className="h-8 gap-1 cursor-pointer"
                  >
                    <Icon name="Plus" size={13} /> Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            color="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Campo'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
