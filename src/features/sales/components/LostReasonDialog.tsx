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
import { SelectField } from 'src/shared/components/ui/select-field';
import { Textarea } from 'src/shared/components/ui/textarea';
import { useTenantOptions } from 'src/shared/hooks/useTenantOptions';

import type { LostReasonInfo } from '../types/sales.types';

interface LostReasonDialogProps {
  open: boolean;
  clientName: string;
  competitors: Competitor[];
  onConfirm: (reason: LostReasonInfo) => void;
  onCancel: () => void;
}

const DEFAULT: { category: string; competitor_uid: string; detail: string } = {
  category: '',
  competitor_uid: '',
  detail: '',
};

export function LostReasonDialog({
  open,
  clientName,
  competitors,
  onConfirm,
  onCancel,
}: LostReasonDialogProps) {
  const [form, setForm] = useState(DEFAULT);
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

  const handleConfirm = () => {
    if (!form.detail.trim()) {
      setError('Agrega un detalle sobre lo que pasó.');
      return;
    }
    const competitor = competitors.find((c) => c.uid === form.competitor_uid);
    onConfirm({
      category: form.category as LostReasonInfo['category'],
      competitor_uid: form.competitor_uid || undefined,
      competitor_name: competitor?.name,
      detail: form.detail.trim(),
    });
    setForm(DEFAULT);
    setError('');
  };

  const handleCancel = () => {
    setForm(DEFAULT);
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
            label="Razón principal *"
            options={reasonOptions}
            value={form.category}
            onChange={(v) => setForm((p) => ({ ...p, category: v as string }))}
          />

          <SelectField
            label="Competidor que ganó"
            options={competitorOptions}
            value={form.competitor_uid}
            onChange={(v) => setForm((p) => ({ ...p, competitor_uid: v as string }))}
            clearable
            placeholder="Sin competidor identificado"
          />

          <Textarea
            label="Detalle"
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
