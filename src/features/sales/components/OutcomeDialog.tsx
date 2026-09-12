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
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { Textarea } from 'src/shared/components/ui/textarea';
import { useLostReasonCategories } from 'src/shared/hooks/useTenantOptions';

import type { LostReasonInfo, WonInfo } from '../types/sales.types';

const NEW_COMPETITOR_KEY = '__new__';

type Step = 'outcome' | 'won' | 'reason';

interface OutcomeDialogProps {
  open: boolean;
  clientName: string;
  competitors: Competitor[];
  /** Si ya se sabe el resultado (ej. se clickeó "Ganado"/"Perdido" en el drawer),
   *  arranca directo en ese paso y se salta la pantalla de selección. */
  initialStep?: Step;
  onConfirm: (
    outcome: 'ganado' | 'perdido',
    lostReason?: LostReasonInfo,
    wonInfo?: WonInfo
  ) => void;
  onCancel: () => void;
}

const DEFAULT_LOST = { reason_type: '', competitor_uid: '', detail: '' };
const DEFAULT_WON = { competitor_uid: '', comment: '' };

export function OutcomeDialog({
  open,
  clientName,
  competitors,
  initialStep = 'outcome',
  onConfirm,
  onCancel,
}: OutcomeDialogProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [lostReason, setLostReason] = useState(DEFAULT_LOST);
  const [wonForm, setWonForm] = useState(DEFAULT_WON);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [error, setError] = useState('');

  // Cada vez que el modal pasa de cerrado a abierto, arranca en el paso pedido
  // (evita tener que elegir Ganado/Perdido de nuevo si ya se eligió afuera).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStep(initialStep);
  }

  const lostReasonCategories = useLostReasonCategories();

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
    setStep(initialStep);
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
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-[440px]">
        {step === 'outcome' && (
          <>
            <DialogHeader>
              <DialogTitle>¿Cómo cerró {clientName}?</DialogTitle>
              <DialogDescription>Registrá el resultado de esta oportunidad.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                onClick={() => {
                  setStep('won');
                  setError('');
                }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-success/30 bg-success/5 hover:bg-success/10 hover:border-success/50 transition-all"
              >
                <Icon name="Trophy" size={28} className="text-success" />
                <span className="text-sm font-bold text-success">Ganado</span>
              </button>
              <button
                onClick={() => {
                  setStep('reason');
                  setError('');
                }}
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
        )}

        {step === 'won' && (
          <>
            <DialogHeader>
              <DialogTitle>¡Oportunidad ganada!</DialogTitle>
              <DialogDescription>
                ¿A quién le ganaste con{' '}
                <span className="font-semibold text-foreground">{clientName}</span>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
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
                placeholder="¿Qué fue clave para ganar?"
                rows={3}
                value={wonForm.comment}
                onChange={(e) => setWonForm((p) => ({ ...p, comment: e.target.value }))}
              />
              {!isNewWon && error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('outcome')}>
                Atrás
              </Button>
              <Button color="success" onClick={handleGanadoConfirm}>
                Confirmar ganancia
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'reason' && (
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
