'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { brandingService } from 'src/features/admin/services/branding.service';
import { localizationService } from 'src/features/settings/services/localization.service';
import { extractApiError } from 'src/lib/api-errors';
import { cache } from 'src/lib/cache';
import { setCurrencyPreferences } from 'src/lib/currency';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { Button, SelectField } from 'src/shared/components/ui';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';
import { useBranding } from 'src/shared/hooks/use-branding';

type CurrencyOption = { code: string; label: string; symbol: string };

/**
 * Moneda global de facturación SaaS (precios de planes) — POST /admin/branding
 * con `billing_currency_code`. Independiente de la moneda operativa del tenant.
 * Solo se renderiza detrás de admin.tenants.manage (ver ProfileView).
 */
export function PlatformLocalizationSettings() {
  const queryClient = useQueryClient();
  const { data: branding } = useBranding();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: currencies = [] } = useQuery({
    queryKey: ['localization-options', 'currencies'],
    queryFn: async (): Promise<CurrencyOption[]> => {
      const res = (await localizationService.getOptions()) as Record<string, unknown>;
      const payload = (res.data ?? res) as { currencies?: CurrencyOption[] };
      return payload.currencies ?? [];
    },
  });

  const current = branding?.billing_currency_code ?? '';
  const value = selected ?? current;

  const updateMutation = useMutation({
    mutationFn: (code: string) => {
      const formData = new FormData();
      formData.append('billing_currency_code', code);
      return brandingService.update(formData);
    },
    onSuccess: (_data, code) => {
      setCurrencyPreferences({ currency: code }, 'platform');
      queryClient.invalidateQueries({ queryKey: queryKeys.branding.public });
      cache.invalidate('admin:plans');
      setSelected(null);
      notify.success('Moneda de facturación actualizada');
    },
    onError: (error) => notify.error(extractApiError(error)),
  });

  const options = currencies.map((c) => ({
    value: c.code,
    label: `${c.code} - ${c.label} (${c.symbol})`,
  }));

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Localización de la plataforma</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moneda usada para los precios de los planes y la facturación SaaS. No afecta la moneda
            operativa de cada tenant.
          </p>
        </div>

        <SelectField
          label="Moneda de facturación"
          searchable
          options={options}
          value={value}
          onChange={(v) => setSelected(v as string)}
          hint="Cambiar la moneda no convierte los precios existentes de los planes."
        />

        <div className="flex justify-end">
          <Button
            color="primary"
            onClick={() => updateMutation.mutate(value)}
            disabled={updateMutation.isPending || !value || value === current}
          >
            <Icon name="Save" size={16} className="mr-2" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar moneda'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
