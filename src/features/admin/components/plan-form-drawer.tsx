'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PlanFormData, planSchema } from 'src/features/admin/schemas/plan.schema';
import { plansService } from 'src/features/admin/services/plans.service';
import { PlanSaaS } from 'src/features/admin/types/admin.types';
import { getCurrencyPreferences } from 'src/lib/currency';
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

const TIERS = ['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((t) => ({ value: t, label: t }));
const BILLING_INTERVALS = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL', label: 'Anual' },
];
const SOPORTE = [
  { value: 'EMAIL', label: 'Solo Email' },
  { value: 'EMAIL_CHAT', label: 'Email + Chat' },
  { value: 'DEDICADO', label: 'Soporte Dedicado' },
];
const MODULOS_FALLBACK: { key: string; label: string }[] = [];

const DEFAULTS: PlanFormData = {
  name: '',
  tier: 'STARTER',
  billing_interval: 'MENSUAL',
  price: 49,
  status: 'ACTIVO',
  max_users: 5,
  ilimitado_usuarios: false,
  storage_gb: 10,
  ilimitado_almacenamiento: false,
  api_calls_month: 10000,
  ilimitado_api: false,
  modules: ['ventas'],
  support_type: 'EMAIL',
  custom_domain: false,
  sso: false,
  advanced_reports: false,
  sla_uptime: null,
};

interface PlanFormDrawerProps {
  plan: PlanSaaS | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PlanSaaS, 'uid' | 'created_at' | 'total_tenants'>) => Promise<void>;
}

export function PlanFormDrawer({ plan, isOpen, onClose, onSave }: PlanFormDrawerProps) {
  const isEditing = !!plan;

  const { data: modulos = MODULOS_FALLBACK } = useQuery({
    queryKey: ['admin', 'plan-modules'],
    queryFn: () => plansService.getModules(),
    staleTime: 0,
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<PlanFormData>({ resolver: zodResolver(planSchema), defaultValues: DEFAULTS });

  const modules = useWatch({ control, name: 'modules' });
  const status = useWatch({ control, name: 'status' });
  const ilimitadoUsuarios = useWatch({ control, name: 'ilimitado_usuarios' });
  const ilimitadoAlmacenamiento = useWatch({ control, name: 'ilimitado_almacenamiento' });
  const ilimitadoApi = useWatch({ control, name: 'ilimitado_api' });
  const customDomain = useWatch({ control, name: 'custom_domain' });
  const ssoValue = useWatch({ control, name: 'sso' });
  const advancedReports = useWatch({ control, name: 'advanced_reports' });

  const ilimitadoMap: Record<string, boolean> = {
    ilimitado_usuarios: ilimitadoUsuarios,
    ilimitado_almacenamiento: ilimitadoAlmacenamiento,
    ilimitado_api: ilimitadoApi,
  };
  const switchMap: Record<string, boolean> = {
    custom_domain: customDomain,
    sso: ssoValue,
    advanced_reports: advancedReports,
  };

  useEffect(() => {
    if (isOpen) {
      reset(
        plan
          ? {
              name: plan.name,
              tier: plan.tier,
              billing_interval: plan.billing_interval ?? 'MENSUAL',
              price: plan.price,
              status: plan.status,
              max_users: plan.max_users ?? 5,
              ilimitado_usuarios: plan.max_users === null,
              storage_gb: plan.features.storage_gb ?? 10,
              ilimitado_almacenamiento: plan.features.storage_gb === null,
              api_calls_month: plan.features.api_calls_month ?? 10000,
              ilimitado_api: plan.features.api_calls_month === null,
              modules: plan.features.modules,
              support_type: plan.features.support_type,
              custom_domain: plan.features.custom_domain,
              sso: plan.features.sso,
              advanced_reports: plan.features.advanced_reports,
              sla_uptime: plan.features.sla_uptime,
            }
          : DEFAULTS
      );
    }
  }, [plan, isOpen, reset]);

  const onSubmit = async (data: PlanFormData) => {
    try {
      await onSave({
        name: data.name,
        tier: data.tier,
        price: data.price,
        billing_interval: data.billing_interval,
        status: data.status,
        max_users: data.ilimitado_usuarios ? null : data.max_users,
        features: {
          storage_gb: data.ilimitado_almacenamiento ? null : data.storage_gb,
          api_calls_month: data.ilimitado_api ? null : data.api_calls_month,
          modules: data.modules,
          support_type: data.support_type,
          sla_uptime: data.sla_uptime,
          custom_domain: data.custom_domain,
          sso: data.sso,
          advanced_reports: data.advanced_reports,
        },
      });
      notify.success('Plan guardado.');
      onClose();
    } catch {
      notify.error('Error al guardar.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <SheetTitle>{isEditing ? `Editar Plan: ${plan?.name}` : 'Nuevo Plan'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modifica el plan' : 'Define el nuevo plan'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
            <div>
              <h3 className="text-sm font-semibold mb-4">Información general</h3>
              <div className="space-y-3">
                <FormInput
                  control={control}
                  name="name"
                  label="Nombre"
                  required
                  placeholder="Plan Pro"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormSelectField control={control} name="tier" label="Tier" options={TIERS} />
                  <FormSelectField
                    control={control}
                    name="billing_interval"
                    label="Facturación"
                    options={BILLING_INTERVALS}
                  />
                </div>
                <FormInput
                  control={control}
                  name="price"
                  label={`Precio (${getCurrencyPreferences('platform').currency})`}
                  type="number"
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Activo</p>
                  <Switch
                    checked={status === 'ACTIVO'}
                    onCheckedChange={(c) => setValue('status', c ? 'ACTIVO' : 'INACTIVO')}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Límites</h3>
              <div className="space-y-3">
                {[
                  { n: 'max_users' as const, i: 'ilimitado_usuarios' as const, l: 'Usuarios' },
                  {
                    n: 'storage_gb' as const,
                    i: 'ilimitado_almacenamiento' as const,
                    l: 'Almacenamiento (GB)',
                  },
                  {
                    n: 'api_calls_month' as const,
                    i: 'ilimitado_api' as const,
                    l: 'API calls/mes',
                  },
                ].map(({ n, i, l }) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="flex-1">
                      <FormInput
                        control={control}
                        name={n}
                        label={l}
                        type="number"
                        disabled={ilimitadoMap[i]}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-5">
                      <Checkbox
                        id={i}
                        checked={ilimitadoMap[i]}
                        onCheckedChange={(c) => setValue(i, c as boolean)}
                      />
                      <label htmlFor={i} className="text-xs text-muted-foreground cursor-pointer">
                        Ilimitado
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Módulos</h3>
              <div className="grid grid-cols-2 gap-2">
                {modulos.map((m) => (
                  <div key={m.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`m-${m.key}`}
                      checked={modules.includes(m.key)}
                      onCheckedChange={() =>
                        setValue(
                          'modules',
                          modules.includes(m.key)
                            ? modules.filter((x) => x !== m.key)
                            : [...modules, m.key],
                          { shouldValidate: true }
                        )
                      }
                    />
                    <label htmlFor={`m-${m.key}`} className="text-sm cursor-pointer">
                      {m.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Opciones</h3>
              <div className="space-y-3">
                {(['custom_domain', 'sso', 'advanced_reports'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm">
                      {k === 'custom_domain'
                        ? 'Custom Domain'
                        : k === 'sso'
                          ? 'SSO / SAML'
                          : 'Reportes Avanzados'}
                    </span>
                    <Switch checked={switchMap[k]} onCheckedChange={(c) => setValue(k, c)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-4">Soporte</h3>
              <div className="space-y-3">
                <FormSelectField
                  control={control}
                  name="support_type"
                  label="Tipo de soporte"
                  options={SOPORTE}
                />
                <FormInput
                  control={control}
                  name="sla_uptime"
                  label="SLA Uptime (%)"
                  type="number"
                  placeholder="ej. 99.9"
                />
              </div>
            </div>
          </div>
          <SheetFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Plan'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
