'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { AlertaFormData, alertaSchema } from 'src/features/admin/schemas/alerta.schema';
import { Alerta } from 'src/features/admin/types/admin.types';
import { notify } from 'src/lib/notify';
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { FormInput } from 'src/shared/components/ui/form-input';
import { FormSelectField } from 'src/shared/components/ui/form-select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { Switch } from 'src/shared/components/ui/switch';

const METRICAS = [
  { value: 'errores', label: 'Errores' },
  { value: 'warnings', label: 'Warnings' },
  { value: 'latencia', label: 'Latencia' },
  { value: 'uptime', label: 'Uptime' },
];
const OPERADORES = [
  { value: '>', label: 'Mayor que (>)' },
  { value: '<', label: 'Menor que (<)' },
  { value: '>=', label: 'Mayor o igual (>=)' },
  { value: '<=', label: 'Menor o igual (<=)' },
];
const PERIODOS = [
  { value: '1h', label: 'Última hora' },
  { value: '6h', label: 'Últimas 6 horas' },
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 días' },
];
//const CANALES = ['EMAIL', 'SLACK', 'PUSH'] as const;
const CANALES = ['EMAIL'] as const;

interface AlertsDrawerProps {
  alerta: Alerta | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Alerta, 'uid'>) => Promise<void>;
}

export function AlertsDrawer({ alerta, isOpen, onClose, onSave }: AlertsDrawerProps) {
  const isEditing = !!alerta;
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<AlertaFormData>({
    resolver: zodResolver(alertaSchema),
    defaultValues: {
      nombre: '',
      metric: 'errores',
      operator: '>',
      value: 50,
      period: '1h',
      canal: ['EMAIL'],
      estado: 'ACTIVO',
    },
  });
  const canal = useWatch({ control, name: 'canal' });

  useEffect(() => {
    if (isOpen)
      reset(
        alerta
          ? {
              nombre: alerta.nombre,
              metric: alerta.metric,
              operator: alerta.operator,
              value: alerta.value,
              period: alerta.period,
              canal: alerta.canales,
              estado: alerta.estado,
            }
          : {
              nombre: '',
              metric: 'errores',
              operator: '>',
              value: 50,
              period: '1h',
              canal: ['EMAIL'],
              estado: 'ACTIVO',
            }
      );
  }, [alerta, isOpen, reset]);

  const onSubmit = async (data: AlertaFormData) => {
    try {
      await onSave({
        nombre: data.nombre,
        metric: data.metric,
        operator: data.operator,
        value: data.value,
        period: data.period,
        canales: data.canal,
        estado: data.estado,
        last_triggered_at: alerta?.last_triggered_at ?? null,
      });
      notify.success(isEditing ? 'Alerta actualizada.' : 'Alerta creada.');
      onClose();
    } catch {
      notify.error('Error al procesar.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <SheetTitle>{isEditing ? 'Editar Alerta' : 'Nueva Alerta'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modifica la configuración' : 'Configura una nueva regla de alerta'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <FormInput
              control={control}
              name="nombre"
              label="Nombre de la alerta"
              required
              placeholder="Errores críticos"
            />
            <div className="grid grid-cols-2 gap-3">
              <FormSelectField control={control} name="metric" label="Métrica" options={METRICAS} />
              <FormSelectField control={control} name="period" label="Período" options={PERIODOS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelectField
                control={control}
                name="operator"
                label="Operador"
                options={OPERADORES}
              />
              <FormInput control={control} name="value" label="Valor" type="number" />
            </div>
            <div>
              <p className="text-caption font-medium text-muted-foreground mb-2">
                Canales de notificación
              </p>
              <div className="space-y-2">
                {CANALES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-body2 cursor-pointer">
                    <Checkbox
                      checked={canal.includes(c)}
                      onCheckedChange={() =>
                        setValue(
                          'canal',
                          canal.includes(c) ? canal.filter((x) => x !== c) : [...canal, c],
                          { shouldValidate: true }
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body2 font-medium">Estado</p>
                <p className="text-caption text-muted-foreground">Activar o desactivar</p>
              </div>
              <Switch
                checked={useWatch({ control, name: 'estado' }) === 'ACTIVO'}
                onCheckedChange={(c) => setValue('estado', c ? 'ACTIVO' : 'INACTIVO')}
              />
            </div>
          </div>
          <SheetFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Alerta'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
