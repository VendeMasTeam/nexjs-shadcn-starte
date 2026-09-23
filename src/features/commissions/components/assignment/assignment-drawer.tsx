'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { usersService } from 'src/features/settings/services/users.service';
import { Button } from 'src/shared/components/ui/button';
import { FormInput } from 'src/shared/components/ui/form-input';
import { FormSelectField } from 'src/shared/components/ui/form-select-field';
import { SelectField } from 'src/shared/components/ui/select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { useDebounce } from 'use-debounce';

import { type AssignmentForm, assignmentSchema } from '../../schemas/assignment.schema';
import type { CommissionAssignment, CommissionPlan } from '../../types/commissions.types';

interface AssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asignacion: CommissionAssignment | null;
  planesDisponibles: CommissionPlan[];
  onPlanSearch: (term: string) => void;
  onSave: (data: AssignmentForm) => Promise<boolean>;
}

const TYPE_LABEL: Record<string, string> = {
  sale: 'Por Venta',
  margin: 'Por Margen',
  target: 'Por Meta',
};

export const AssignmentDrawer: React.FC<AssignmentDrawerProps> = ({
  isOpen,
  onClose,
  asignacion,
  planesDisponibles,
  onPlanSearch,
  onSave,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    mode: 'onChange',
  });

  const watchPlanId = useWatch({ control, name: 'plan_uid' });
  const planInfo = planesDisponibles.find((p) => p.uid === watchPlanId);

  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch] = useDebounce(userSearch, 400);
  const [selectedUserLabel, setSelectedUserLabel] = useState('');

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users', 'search', debouncedUserSearch],
    queryFn: async () => {
      const res = await usersService.getAll({
        search: debouncedUserSearch || undefined,
        per_page: 25,
      });
      return (
        ((res as Record<string, unknown>).data ?? []) as Array<{ uid: string; name: string }>
      ).map((u) => ({ value: u.uid, label: u.name }));
    },
    staleTime: 0,
  });

  const watchUserUid = useWatch({ control, name: 'user_uid' });

  useEffect(() => {
    if (isOpen && asignacion) {
      reset({
        uid: asignacion.uid,
        user_uid: asignacion.user_uid,
        user_name: asignacion.user_name,
        plan_uid: asignacion.plan_uid || '',
        starts_at: asignacion.start_date || new Date().toISOString().split('T')[0],
        ends_at: asignacion.end_date || '',
      });
    }
  }, [isOpen, asignacion, reset]);

  const onSubmit = async (data: AssignmentForm) => {
    const success = await onSave(data);
    if (success) onClose();
  };

  const planOptions = [
    { value: '', label: '-- Seleccionar Plan --' },
    ...planesDisponibles
      .filter((p) => p.is_active)
      .map((p) => ({ value: p.uid, label: `${p.name} (${TYPE_LABEL[p.type] ?? p.type})` })),
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-3">
            {asignacion && (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {asignacion.user_name.charAt(0)}
              </div>
            )}
            <div>
              <SheetTitle>{asignacion?.user_name}</SheetTitle>
              <SheetDescription>Asignación de plan de comisión</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-6">
            {!asignacion && (
              <SelectField
                label="Vendedor"
                required
                searchable
                onSearch={setUserSearch}
                value={watchUserUid ?? ''}
                options={(() => {
                  if (
                    watchUserUid &&
                    selectedUserLabel &&
                    !userOptions.find((o) => o.value === watchUserUid)
                  ) {
                    return [{ value: watchUserUid, label: selectedUserLabel }, ...userOptions];
                  }
                  return userOptions;
                })()}
                onChange={(v) => {
                  const u = userOptions.find((o) => o.value === v);
                  if (u) setSelectedUserLabel(u.label);
                  setUserSearch('');
                  setValue('user_uid', v as string, { shouldValidate: true });
                }}
              />
            )}
            <FormSelectField
              control={control}
              name="plan_uid"
              label="Plan de Comisión"
              required
              searchable
              onSearch={onPlanSearch}
              options={planOptions}
            />

            {planInfo && (
              <div className="bg-muted/40 p-4 border border-border/40 rounded-lg text-sm">
                <p className="font-semibold text-foreground mb-1">Resumen del Plan</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    Tipo:{' '}
                    <span className="font-medium text-foreground">
                      {TYPE_LABEL[planInfo.type] ?? planInfo.type}
                    </span>
                  </li>
                  <li>
                    Base:{' '}
                    <span className="font-medium text-foreground">{planInfo.base_percentage}%</span>
                  </li>
                  <li>
                    Tramos Escalonados:{' '}
                    <span className="font-medium text-foreground">
                      {planInfo.tiers?.length} configurados
                    </span>
                  </li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                control={control}
                name="starts_at"
                type="date"
                label="Vigencia Inicio"
                required
              />
              <FormInput control={control} name="ends_at" type="date" label="Vigencia Fin" />
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Asignación'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
