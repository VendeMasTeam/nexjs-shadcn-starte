'use client';

import { useState } from 'react';
import { BillingStatusBadge } from 'src/features/admin/components/billing-status-badge';
import { Factura } from 'src/features/admin/types/admin.types';
import { formatMoney } from 'src/lib/currency';
import { formatDate } from 'src/lib/date';
import { notify } from 'src/lib/notify';
import { Avatar, AvatarFallback } from 'src/shared/components/ui/avatar';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface BillingDetailDrawerProps {
  factura: Factura | null;
  isOpen: boolean;
  onClose: () => void;
  onMarcarPagada: (id: string) => Promise<void>;
}

function getInitials(nombre: string) {
  return (nombre ?? '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function BillingDetailDrawer({
  factura,
  isOpen,
  onClose,
  onMarcarPagada,
}: BillingDetailDrawerProps) {
  const [isPaying, setIsPaying] = useState(false);

  if (!factura) return null;

  const canMarkPaid = factura.status === 'PENDIENTE' || factura.status === 'VENCIDA';

  const handleMarcarPagada = async () => {
    setIsPaying(true);
    try {
      await delay(800);
      await onMarcarPagada(factura.uid);
      notify.success('Factura marcada como pagada.');
      onClose();
    } catch {
      notify.error('Error al procesar. Intenta nuevamente.');
    } finally {
      setIsPaying(false);
    }
  };

  const timelineSteps = [
    { label: 'Creada', date: factura.issued_at, done: true, icon: 'Clock' as const },
    { label: 'Enviada', date: factura.issued_at, done: true, icon: 'Send' as const },
    {
      label:
        factura.status === 'PAGADA'
          ? 'Pagada'
          : factura.status === 'VENCIDA'
            ? 'Vencida'
            : 'Pendiente de pago',
      date: factura.status === 'PAGADA' ? factura.due_at : '',
      done: factura.status === 'PAGADA',
      icon: 'CheckCircle2' as const,
      isError: factura.status === 'VENCIDA',
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="text-sm bg-blue-100 text-blue-700 font-bold">
                {getInitials(factura.tenant_nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-body2 font-semibold truncate">
                  {factura.tenant_nombre}
                </SheetTitle>
                <BillingStatusBadge estado={factura.status} />
              </div>
              <SheetDescription className="text-caption text-muted-foreground">
                Factura #{factura.uid}
              </SheetDescription>
              <p className="text-caption text-muted-foreground">
                Emitida: {formatDate(factura.issued_at)} · Vence: {formatDate(factura.due_at)}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Detalle de factura */}
          <div>
            <h3 className="text-body2 font-semibold text-foreground mb-3">Detalle de la factura</h3>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-body2">
                <span className="text-muted-foreground">
                  Suscripción {factura.plan_nombre} — {factura.periodo}
                </span>
                <span className="font-medium text-foreground">
                  {formatMoney(factura.subtotal, {
                    scope: 'platform',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t border-border/40 pt-2 space-y-1.5">
                <div className="flex justify-between text-body2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    {formatMoney(factura.subtotal, {
                      scope: 'platform',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-body2">
                  <span className="text-muted-foreground">IVA 16%</span>
                  <span className="text-foreground">
                    {formatMoney(factura.tax, {
                      scope: 'platform',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-body2 border-t border-border/40 pt-2 font-semibold">
                  <span className="text-foreground">TOTAL</span>
                  <span className="text-foreground text-h6">
                    {formatMoney(factura.total, {
                      scope: 'platform',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline de estados */}
          <div>
            <h3 className="text-body2 font-semibold text-foreground mb-3">Historial de estados</h3>
            <div className="space-y-0">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        step.isError
                          ? 'bg-red-100 text-red-600'
                          : step.done
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon name={step.icon} className="h-3.5 w-3.5" />
                    </div>
                    {i < timelineSteps.length - 1 && <div className="w-px h-6 bg-border/40 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p
                      className={`text-body2 font-medium ${step.isError ? 'text-red-600' : step.done ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-caption text-muted-foreground">{formatDate(step.date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="border-t border-border/40 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={() => notify.success('Exportación lista. Descargando...')}
          >
            Descargar PDF
          </Button>
          {canMarkPaid && (
            <Button onClick={handleMarcarPagada} disabled={isPaying}>
              {isPaying ? 'Procesando...' : 'Marcar como Pagada'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
