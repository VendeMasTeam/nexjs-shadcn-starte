'use client';

import { useMemo, useState } from 'react';
import type { Competitor } from 'src/features/intelligence/types';
import { Button } from 'src/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/shared/components/ui/dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { SelectField } from 'src/shared/components/ui/select-field';
import { Textarea } from 'src/shared/components/ui/textarea';
import { useTenantOptions } from 'src/shared/hooks/useTenantOptions';

import type { LostReasonInfo } from '../types/sales.types';

type Step = 'outcome' | 'reason';

interface OutcomeDialogProps {
  open: boolean;
  clientName: string;
  competitors: Competitor[];
  onConfirm: (outcome: 'ganado' | 'perdido', lostReason?: LostReasonInfo) => void;
  onCancel: () => void;
}

const DEFAULT_REASON = { category: '', competitor_uid: '', detail: '' };

export function OutcomeDialog({
  open,
  clientName,
  competitors,
  onConfirm,
  onCancel,
}: OutcomeDialogProps) {
  const [step, setStep] = useState<Step>('outcome');
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [error, setError] = useState('');

  const { lostReasonCategories } = useTenantOptions();

  const reasonOptions = useMemo(() => {
    const data = lostReasonCategories.data as
      | { uid: string; name: string; key: string }[]
      | undefined;
    if (!data || data.length === 0) return [{ value: '', label: 'Cargando...' }];
    return data.map((opt) => ({ value: opt.key, label: opt.name }));
  }, [lostReasonCategories.data]);

  const competitorOptions = [
    { value: '', label: 'Sin competidor identificado' },
    ...competitors.map((c) => ({ value: c.uid, label: c.name })),
  ];

  const reset = () => {
    setStep('outcome');
    setReason(DEFAULT_REASON);
    setError('');
  };

  const handleGanado = () => {
    onConfirm('ganado');
    reset();
  };

  const handlePerdidoConfirm = () => {
    if (!reason.detail.trim()) {
      setError('Agrega un detalle sobre lo que pasó.');
      return;
    }
    const competitor = competitors.find((c) => c.uid === reason.competitor_uid);
    onConfirm('perdido', {
      category: reason.category as LostReasonInfo['category'],
      competitor_uid: reason.competitor_uid || undefined,
      competitor_name: competitor?.name,
      detail: reason.detail.trim(),
    });
    reset();
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-[440px]">
        {step === 'outcome' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Cómo cerró {clientName}?</DialogTitle>
              <DialogDescription>Registrá el resultado de esta oportunidad.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                onClick={handleGanado}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-success/30 bg-success/5 hover:bg-success/10 hover:border-success/50 transition-all"
              >
                <Icon name="Trophy" size={28} className="text-success" />
                <span className="text-sm font-bold text-success">Ganado</span>
              </button>
              <button
                onClick={() => setStep('reason')}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50 transition-all"
              >
                <Icon name="XCircle" size={28} className="text-destructive" />
                <span className="text-sm font-bold text-destructive">Perdido</span>
              </button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Razón de pérdida</DialogTitle>
              <DialogDescription>
                ¿Por qué se perdió{' '}
                <span className="font-semibold text-foreground">{clientName}</span>? Esta
                información alimenta el análisis competitivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <SelectField
                label="Razón principal *"
                options={reasonOptions}
                value={reason.category}
                onChange={(v) => setReason((p) => ({ ...p, category: v as string }))}
              />
              <SelectField
                label="Competidor que ganó"
                options={competitorOptions}
                value={reason.competitor_uid}
                onChange={(v) => setReason((p) => ({ ...p, competitor_uid: v as string }))}
                clearable
                placeholder="Sin competidor identificado"
              />
              <Textarea
                label="Detalle"
                required
                placeholder="Describe qué pasó. Cuanto más detalle, mejor para el equipo."
                rows={3}
                value={reason.detail}
                onChange={(e) => {
                  setReason((p) => ({ ...p, detail: e.target.value }));
                  setError('');
                }}
                error={error}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('outcome')}>
                Atrás
              </Button>
              <Button color="error" onClick={handlePerdidoConfirm}>
                Confirmar pérdida
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
