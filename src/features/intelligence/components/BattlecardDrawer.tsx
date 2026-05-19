'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { notify } from 'src/lib/notify';
import {
  Button,
  SelectField,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';
import { Input, Textarea } from 'src/shared/components/ui';
import { Icon } from 'src/shared/components/ui';

import { type BattlecardFormData, battlecardSchema } from '../schemas/battlecard.schema';
import type { Battlecard, Competitor } from '../types';
import { ObjectionItem } from './ObjectionItem';

interface Props {
  open: boolean;
  item?: Battlecard | null;
  competitors: Competitor[];
  onClose: () => void;
  onCreate: (
    data: Omit<
      Battlecard,
      | 'uid'
      | 'win_rate'
      | 'deals_tracked'
      | 'deals_won'
      | 'created_at'
      | 'updated_at'
      | 'deals_value'
    >
  ) => Promise<boolean>;
  onUpdate: (
    uid: string,
    changes: Partial<
      Omit<
        Battlecard,
        'uid' | 'win_rate' | 'deals_tracked' | 'deals_won' | 'created_at' | 'updated_at'
      >
    >
  ) => Promise<boolean>;
}

const COMPETITOR_OPTIONS_FROM = (competitors: Competitor[]) =>
  competitors.map((c) => ({ value: c.uid, label: c.name }));

const DEFAULT_VALUES: BattlecardFormData = {
  competitorId: '',
  summary: '',
  ourStrengths: [{ value: '' }],
  theirStrengths: [{ value: '' }],
  objections: [{ objection: '', response: '' }],
};

export function BattlecardDrawer({ open, item, competitors, onClose, onCreate, onUpdate }: Props) {
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BattlecardFormData>({
    resolver: zodResolver(battlecardSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    fields: strengthFields,
    append: appendStrength,
    remove: removeStrength,
  } = useFieldArray({ control, name: 'ourStrengths' });

  const {
    fields: weaknessFields,
    append: appendWeakness,
    remove: removeWeakness,
  } = useFieldArray({ control, name: 'theirStrengths' });

  const {
    fields: objectionFields,
    append: appendObjection,
    remove: removeObjection,
  } = useFieldArray({ control, name: 'objections' });

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          competitorId: item.competitor_uid,
          summary: item.summary,
          ourStrengths: (item.our_strengths ?? []).map((v) => ({ value: v })),
          theirStrengths: (item.their_strengths ?? []).map((v) => ({ value: v })),
          objections: (item.objections ?? []).map(({ id, objection, response }) => ({
            id,
            objection,
            response,
          })),
        });
      } else {
        reset(DEFAULT_VALUES);
      }
    }
  }, [open, item, reset]);

  const onSubmit = async (data: BattlecardFormData) => {
    const competitor = competitors.find((c) => c.uid === data.competitorId);
    const payload = {
      competitor_uid: data.competitorId,
      competitor_name: competitor?.name ?? '',
      title: item?.title ?? `${competitor?.name ?? 'Competidor'} — Battlecard`,
      summary: data.summary,
      strengths: data.ourStrengths.map((s) => s.value),
      weaknesses: data.theirStrengths.map((s) => s.value),
      objections: data.objections.map((o, i) => ({
        id: o.id ?? `obj-${Date.now()}-${i}`,
        objection: o.objection,
        response: o.response,
      })),
    };

    let success: boolean;
    if (isEdit && item) {
      success = await onUpdate(item.uid, payload);
      if (success) notify.success('Battlecard actualizada');
    } else {
      success = await onCreate(payload);
      if (success) notify.success('Battlecard creada');
    }
    if (success) onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[540px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <SheetTitle>{isEdit ? 'Editar battlecard' : 'Nueva battlecard'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Actualiza el posicionamiento y las respuestas frente a este competidor.'
              : 'Crea una ficha táctica para que el equipo sepa cómo competir.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <form id="battlecard-form" onSubmit={handleSubmit(onSubmit)} className="py-6 space-y-8">
            {/* ── Sección 1: Info básica ─────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  1
                </span>
                Competidor
              </h3>

              <Controller
                name="competitorId"
                control={control}
                render={({ field }) => (
                  <SelectField
                    label="Competidor"
                    required
                    searchable
                    options={COMPETITOR_OPTIONS_FROM(competitors)}
                    value={field.value}
                    onChange={(v) => field.onChange(v as string)}
                    placeholder="Selecciona el competidor"
                    error={errors.competitorId?.message}
                  />
                )}
              />

              <Textarea
                label="Posicionamiento (una línea)"
                required
                {...register('summary')}
                placeholder="¿En una oración: por qué ganamos frente a este competidor?"
                rows={3}
                error={errors.summary?.message}
              />
            </div>

            <hr className="border-border/40" />

            {/* ── Sección 2: Nuestras ventajas ──────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-[10px]">
                  2
                </span>
                Nuestras ventajas
              </h3>

              {strengthFields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Input
                    {...register(`ourStrengths.${i}.value`)}
                    placeholder={`Ventaja ${i + 1}`}
                    className="flex-1"
                  />
                  {strengthFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      color="error"
                      onClick={() => removeStrength(i)}
                    >
                      <Icon name="Minus" size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {errors.ourStrengths?.root?.message && (
                <p className="text-caption text-destructive">{errors.ourStrengths.root.message}</p>
              )}
              {errors.ourStrengths?.message && (
                <p className="text-caption text-destructive">{errors.ourStrengths.message}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendStrength({ value: '' })}
              >
                <Icon name="Plus" size={14} />
                Agregar ventaja
              </Button>
            </div>

            <hr className="border-border/40" />

            {/* ── Sección 3: Fortalezas del competidor ──────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-warning/10 text-warning flex items-center justify-center text-[10px]">
                  3
                </span>
                Fortalezas del competidor
              </h3>

              {weaknessFields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Input
                    {...register(`theirStrengths.${i}.value`)}
                    placeholder={`Fortaleza a neutralizar ${i + 1}`}
                    className="flex-1"
                  />
                  {weaknessFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      color="error"
                      onClick={() => removeWeakness(i)}
                    >
                      <Icon name="Minus" size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {errors.theirStrengths?.message && (
                <p className="text-caption text-destructive">{errors.theirStrengths.message}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendWeakness({ value: '' })}
              >
                <Icon name="Plus" size={14} />
                Agregar fortaleza
              </Button>
            </div>

            <hr className="border-border/40" />

            {/* ── Sección 4: Objeciones ─────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-error/10 text-error flex items-center justify-center text-[10px]">
                  4
                </span>
                Objeciones & Respuestas
              </h3>

              {objectionFields.map((field, i) => (
                <ObjectionItem
                  key={field.id}
                  index={i}
                  register={register}
                  errors={errors}
                  onRemove={() => removeObjection(i)}
                  canRemove={objectionFields.length > 1}
                />
              ))}
              {errors.objections?.message && (
                <p className="text-caption text-destructive">{errors.objections.message}</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendObjection({ objection: '', response: '' })}
              >
                <Icon name="Plus" size={14} />
                Agregar objeción
              </Button>
            </div>
          </form>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="battlecard-form"
            color="primary"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear battlecard'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
