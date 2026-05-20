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
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { Textarea } from 'src/shared/components/ui/textarea';
import { useTenantOptions } from 'src/shared/hooks/useTenantOptions';

import type { LostReasonInfo } from '../types/sales.types';

const NEW_COMPETITOR_KEY = '__new__';

interface LostReasonDialogProps {
  open: boolean;
  clientName: string;
  competitors: Competitor[];
  onConfirm: (reason: LostReasonInfo) => void;
  onCancel: () => void;
}

const DEFAULT = { reason_type: '', competitor_uid: '', detail: '' };

export function LostReasonDialog({
  open,
  clientName,
  competitors,
  onConfirm,
  onCancel,
}: LostReasonDialogProps) {
  const [form, setForm] = useState(DEFAULT);
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

  const isNewCompetitor = form.competitor_uid === NEW_COMPETITOR_KEY;

  const handleConfirm = () => {
    if (!form.detail.trim()) {
      setError('Agrega un detalle sobre lo que pasó.');
      return;
    }
    if (isNewCompetitor && !newCompetitorName.trim()) {
      setError('Ingresá el nombre del competidor.');
      return;
    }
    const competitor = competitors.find((c) => c.uid === form.competitor_uid);
    const lostReason: LostReasonInfo = {
      reason_type: form.reason_type,
      detail: form.detail.trim(),
      ...(isNewCompetitor
        ? { competitor: { name: newCompetitorName.trim() } }
        : competitor
          ? { competitor_uid: competitor.uid, competitor_name: competitor.name }
          : {}),
    };
    onConfirm(lostReason);
    setForm(DEFAULT);
    setNewCompetitorName('');
    setError('');
  };

  const handleCancel = () => {
    setForm(DEFAULT);
    setNewCompetitorName('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Registrar razón de pérdida</DialogTitle>
          <DialogDescription>
            ¿Por qué se perdió <span className="font-semibold text-foreground">{clientName}</span>?
            Esta información alimenta el análisis competitivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SelectField
            label="Razón principal"
            options={reasonOptions}
            value={form.reason_type}
            onChange={(v) => setForm((p) => ({ ...p, reason_type: v as string }))}
          />
          <SelectField
            label="Competidor que ganó"
            options={competitorOptions}
            value={form.competitor_uid}
            onChange={(v) => {
              setForm((p) => ({ ...p, competitor_uid: v as string }));
              setNewCompetitorName('');
              setError('');
            }}
            clearable
            placeholder="Sin competidor identificado"
          />
          {isNewCompetitor && (
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
            value={form.detail}
            onChange={(e) => {
              setForm((p) => ({ ...p, detail: e.target.value }));
              setError('');
            }}
            error={error}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button color="error" onClick={handleConfirm}>
            Confirmar pérdida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
