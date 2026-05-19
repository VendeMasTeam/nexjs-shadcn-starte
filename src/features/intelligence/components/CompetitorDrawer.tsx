'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';

export interface CompetitorFormData {
  name: string;
  website?: string;
  strengths: string[];
  weaknesses: string[];
  is_active: boolean;
}

interface Props {
  open: boolean;
  competitor?: CompetitorFormData | null;
  onClose: () => void;
  onSave: (data: CompetitorFormData) => Promise<void>;
}

export function CompetitorDrawer({ open, competitor, onClose, onSave }: Props) {
  const isEdit = !!competitor;
  const [name, setName] = useState(competitor?.name ?? '');
  const [website, setWebsite] = useState(competitor?.website ?? '');
  const [strengths, setStrengths] = useState((competitor?.strengths ?? []).join('\n'));
  const [weaknesses, setWeaknesses] = useState((competitor?.weaknesses ?? []).join('\n'));
  const [isActive, setIsActive] = useState(competitor?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        website: website.trim() || undefined,
        strengths: strengths.split('\n').filter(Boolean),
        weaknesses: weaknesses.split('\n').filter(Boolean),
        is_active: isActive,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar' : 'Nuevo'} competidor</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-6 space-y-4">
          <Input
            label="Nombre"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Competidor XYZ"
          />
          <Input
            label="Web"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">Fortalezas (una por línea)</label>
            <textarea
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Debilidades (una por línea)</label>
            <textarea
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Activo</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
