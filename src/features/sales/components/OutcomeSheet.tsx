'use client';

import { useMemo, useState } from 'react';
import type { Competitor } from 'src/features/intelligence/types';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { Textarea } from 'src/shared/components/ui/textarea';
import { useTenantOptions } from 'src/shared/hooks/useTenantOptions';

import type { LostReasonInfo, WonInfo } from '../types/sales.types';

const NEW_COMPETITOR_KEY = '__new__';

type Step = 'outcome' | 'won' | 'reason';

interface OutcomeSheetProps {
  open: boolean;
  clientName: string;
  competitors: Competitor[];
  onConfirm: (
    outcome: 'ganado' | 'perdido',
    lostReason?: LostReasonInfo,
    wonInfo?: WonInfo
  ) => void;
  onCancel: () => void;
}

const DEFAULT_LOST = { reason_type: '', competitor_uid: '', detail: '' };
const DEFAULT_WON = { competitor_uid: '', comment: '' };

export function OutcomeSheet({
  open,
  clientName,
  competitors,
  onConfirm,
  onCancel,
}: OutcomeSheetProps) {
  const [step, setStep] = useState<Step>('outcome');
  const [lostReason, setLostReason] = useState(DEFAULT_LOST);
  const [wonForm, setWonForm] = useState(DEFAULT_WON);
  const [newCompetitorName, setNewCompetitorName] = useState('');
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
    { value: NEW_COMPETITOR_KEY, label: '+ Crear nuevo competidor' },
  ];

  const isNewLost = lostReason.competitor_uid === NEW_COMPETITOR_KEY;
  const isNewWon = wonForm.competitor_uid === NEW_COMPETITOR_KEY;

  const reset = () => {
    setStep('outcome');
    setLostReason(DEFAULT_LOST);
    setWonForm(DEFAULT_WON);
    setNewCompetitorName('');
    setError('');
  };

  const handleGanadoConfirm = () => {
    if (isNewWon && !newCompetitorName.trim()) {
      setError('Ingresá el nombre del competidor.');
      return;
    }
    const competitor = competitors.find((c) => c.uid === wonForm.competitor_uid);
    const wonInfo: WonInfo = {
      comment: wonForm.comment.trim() || undefined,
      ...(isNewWon
        ? { competitor: { name: newCompetitorName.trim() } }
        : competitor
          ? { competitor_uid: competitor.uid }
          : {}),
    };
    onConfirm('ganado', undefined, wonInfo);
    reset();
  };

  const handlePerdidoConfirm = () => {
    if (!lostReason.detail.trim()) {
      setError('Agrega un detalle sobre lo que pasó.');
      return;
    }
    if (isNewLost && !newCompetitorName.trim()) {
      setError('Ingresá el nombre del competidor.');
      return;
    }
    const competitor = competitors.find((c) => c.uid === lostReason.competitor_uid);
    const info: LostReasonInfo = {
      reason_type: lostReason.reason_type,
      detail: lostReason.detail.trim(),
      ...(isNewLost
        ? { competitor: { name: newCompetitorName.trim() } }
        : competitor
          ? { competitor_uid: competitor.uid, competitor_name: competitor.name }
          : {}),
    };
    onConfirm('perdido', info);
    reset();
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleChangeCompetitor = (v: string, target: 'won' | 'lost') => {
    if (target === 'won') setWonForm((p) => ({ ...p, competitor_uid: v }));
    else setLostReason((p) => ({ ...p, competitor_uid: v }));
    setNewCompetitorName('');
    setError('');
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleCancel()}>
      <SheetContent side="right" className="sm:max-w-[680px] flex flex-col p-0">
        {step === 'outcome' && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <SheetTitle>¿Cómo cerró {clientName}?</SheetTitle>
              <SheetDescription>Registra el resultado de esta oportunidad.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 px-6 py-8">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setStep('won');
                    setError('');
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-success/30 bg-success/5 hover:bg-success/10 hover:border-success/50 transition-all"
                >
                  <Icon name="Trophy" size={32} className="text-success" />
                  <span className="text-sm font-bold text-success">Ganado</span>
                </button>
                <button
                  onClick={() => {
                    setStep('reason');
                    setError('');
                  }}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/50 transition-all"
                >
                  <Icon name="XCircle" size={32} className="text-destructive" />
                  <span className="text-sm font-bold text-destructive">Perdido</span>
                </button>
              </div>
            </div>

            <SheetFooter className="border-t border-border/40 px-6 pt-4 pb-6">
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancelar
              </Button>
            </SheetFooter>
          </>
        )}

        {step === 'won' && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <SheetTitle>¡Oportunidad ganada!</SheetTitle>
              <SheetDescription>
                ¿A quién le ganaste con{' '}
                <span className="font-semibold text-foreground">{clientName}</span>?
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
              <SelectField
                label="Competidor al que le ganamos"
                options={competitorOptions}
                value={wonForm.competitor_uid}
                onChange={(v) => handleChangeCompetitor(v as string, 'won')}
                clearable
                placeholder="Sin competidor identificado"
              />
              {isNewWon && (
                <Input
                  label="Nombre del nuevo competidor *"
                  value={newCompetitorName}
                  onChange={(e) => {
                    setNewCompetitorName(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej: Empresa XYZ"
                  error={error}
                />
              )}
              <Textarea
                label="Notas (opcional)"
                placeholder="¿Qué fue clave para ganar? Ayuda al equipo a replicarlo."
                rows={3}
                value={wonForm.comment}
                onChange={(e) => setWonForm((p) => ({ ...p, comment: e.target.value }))}
              />
              {!isNewWon && error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <SheetFooter className="border-t border-border/40 px-6 pt-4 pb-6 gap-2">
              <Button variant="outline" onClick={() => setStep('outcome')}>
                Atrás
              </Button>
              <Button color="success" onClick={handleGanadoConfirm} className="flex-1">
                Confirmar ganancia
              </Button>
            </SheetFooter>
          </>
        )}

        {step === 'reason' && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <SheetTitle>Razón de pérdida</SheetTitle>
              <SheetDescription>
                ¿Por qué se perdió{' '}
                <span className="font-semibold text-foreground">{clientName}</span>? Esta
                información alimenta el análisis competitivo.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
              <SelectField
                label="Razón principal"
                options={reasonOptions}
                value={lostReason.reason_type}
                onChange={(v) => setLostReason((p) => ({ ...p, reason_type: v as string }))}
              />
              <SelectField
                label="Competidor que ganó"
                options={competitorOptions}
                value={lostReason.competitor_uid}
                onChange={(v) => handleChangeCompetitor(v as string, 'lost')}
                clearable
                placeholder="Sin competidor identificado"
              />
              {isNewLost && (
                <Input
                  label="Nombre del nuevo competidor *"
                  value={newCompetitorName}
                  onChange={(e) => {
                    setNewCompetitorName(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej: Empresa XYZ"
                />
              )}
              <Textarea
                label="Detalle *"
                required
                placeholder="Describe qué pasó. Cuanto más detalle, mejor para el equipo."
                rows={3}
                value={lostReason.detail}
                onChange={(e) => {
                  setLostReason((p) => ({ ...p, detail: e.target.value }));
                  setError('');
                }}
                error={!isNewLost ? error : undefined}
              />
            </div>

            <SheetFooter className="border-t border-border/40 px-6 pt-4 pb-6 gap-2">
              <Button variant="outline" onClick={() => setStep('outcome')}>
                Atrás
              </Button>
              <Button color="error" onClick={handlePerdidoConfirm} className="flex-1">
                Confirmar pérdida
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
