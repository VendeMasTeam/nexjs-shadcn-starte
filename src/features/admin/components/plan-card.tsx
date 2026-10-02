'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlanSaaS, TierPlan } from 'src/features/admin/types/admin.types';
import { formatMoney } from 'src/lib/currency';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'src/shared/components/ui/accordion';
import { EditButton, MoreActionsMenu } from 'src/shared/components/ui/action-buttons';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';

interface PlanCardProps {
  plan: PlanSaaS;
  onEdit: (plan: PlanSaaS) => void;
  onDelete: (plan: PlanSaaS) => Promise<void>;
}

const tierConfig: Record<TierPlan, { border: string; badgeClass: string; label: string }> = {
  STARTER: {
    border: 'border-t-4 border-t-gray-400',
    badgeClass: 'bg-gray-100 text-gray-600 border-transparent',
    label: 'Starter',
  },
  PRO: {
    border: 'border-t-4 border-t-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 border-transparent',
    label: 'Pro',
  },
  BUSINESS: {
    border: 'border-t-4 border-t-purple-500',
    badgeClass: 'bg-purple-100 text-purple-700 border-transparent',
    label: 'Business',
  },
  ENTERPRISE: {
    border: 'border-t-4 border-t-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 border-transparent',
    label: 'Enterprise',
  },
};

const soporteLabel: Record<string, string> = {
  EMAIL: 'Solo Email',
  EMAIL_CHAT: 'Email + Chat',
  DEDICADO: 'Soporte Dedicado',
};
const moduloLabel: Record<string, string> = {
  ventas: 'Ventas',
  inventario: 'Inventario',
  rh: 'RH / Comisiones',
  reportes: 'Reportes',
  'multi-currency': 'Multi-currency',
  'api-publica': 'API Pública',
};

export function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  const router = useRouter();
  const config = tierConfig[plan.tier] ?? tierConfig.STARTER;
  const f = plan.features;
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={`bg-card rounded-2xl shadow-card overflow-hidden ${config.border}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="soft" className={config.badgeClass}>
              {config.label}
            </Badge>
            {plan.status !== 'ACTIVO' && (
              <Badge
                variant="soft"
                className="bg-gray-100 text-gray-500 border-transparent text-xs"
              >
                {plan.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <EditButton onClick={() => onEdit(plan)} />
            <MoreActionsMenu
              items={[
                {
                  label: 'Editar',
                  icon: <Icon name="Pencil" className="h-3.5 w-3.5" />,
                  onClick: () => onEdit(plan),
                },
                {
                  label: deleting
                    ? 'Procesando...'
                    : plan.total_tenants > 0
                      ? 'Desactivar'
                      : 'Eliminar',
                  icon: <Icon name="Trash2" className="h-3.5 w-3.5" />,
                  color: 'error',
                  disabled: deleting,
                  onClick: async () => {
                    setDeleting(true);
                    try {
                      await onDelete(plan);
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]}
            />
          </div>
        </div>
        <h3 className="text-h6 font-bold text-foreground">{plan.name}</h3>
        <p className="text-body2 text-muted-foreground mb-4">
          <span className="text-2xl font-bold text-foreground">
            {formatMoney(plan.price, {
              scope: 'platform',
              currency: plan.currency_code,
              maximumFractionDigits: 0,
            })}
          </span>{' '}
          / mes por cliente
        </p>
        <Accordion type="single" collapsible defaultValue="features">
          <AccordionItem value="features" className="border-0">
            <AccordionTrigger className="py-2 text-body2 font-semibold text-foreground hover:no-underline">
              Características incluidas
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-body2">
                  <Icon name="Users" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Usuarios:</span>
                  <span className="font-medium text-foreground">
                    {plan.max_users === null ? 'Ilimitados' : `hasta ${plan.max_users}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-body2">
                  <Icon name="HardDrive" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Almacenamiento:</span>
                  <span className="font-medium text-foreground">
                    {f.storage_gb === null ? 'Ilimitado' : `${f.storage_gb} GB`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-body2">
                  <Icon name="Zap" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">API calls/mes:</span>
                  <span className="font-medium text-foreground">
                    {f.api_calls_month === null
                      ? 'Ilimitadas'
                      : f.api_calls_month >= 1000000
                        ? `${(f.api_calls_month / 1000000).toFixed(0)}M`
                        : `${(f.api_calls_month / 1000).toFixed(0)}k`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-body2">
                  <Icon name="Headphones" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Soporte:</span>
                  <span className="font-medium text-foreground">
                    {soporteLabel[f.support_type]}
                  </span>
                </div>
                <div className="pt-1">
                  <p className="text-caption font-semibold text-muted-foreground mb-1.5">
                    Módulos:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {f.modules.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">
                        {moduloLabel[m] || m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <div className="flex items-center gap-1.5 text-caption">
                    {f.custom_domain ? (
                      <Icon name="CheckCircle2" className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Icon name="XCircle" className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                    <span className="text-muted-foreground">Custom Domain</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-caption">
                    {f.sso ? (
                      <Icon name="CheckCircle2" className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Icon name="XCircle" className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                    <span className="text-muted-foreground">SSO</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-caption">
                    {f.advanced_reports ? (
                      <Icon name="CheckCircle2" className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Icon name="XCircle" className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                    <span className="text-muted-foreground">Reportes avanzados</span>
                  </div>
                  {f.sla_uptime && (
                    <div className="flex items-center gap-1.5 text-caption">
                      <Icon name="CheckCircle2" className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-muted-foreground">SLA {f.sla_uptime}%</span>
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="border-t border-border/40 pt-4 mt-3">
          <p className="text-body2 text-muted-foreground mb-2">
            <span className="font-semibold text-foreground">{plan.total_tenants}</span> clientes
            activos
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => router.push('/admin/tenants')}
          >
            Ver clientes →
          </Button>
        </div>
      </div>
    </div>
  );
}
