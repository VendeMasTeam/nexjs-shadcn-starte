'use client';

import { useRef, useState } from 'react';
import type { PipelineStage } from 'src/features/sales/types/sales.types';
import { customFieldsService } from 'src/features/settings/services/custom-fields.service';
import { Button } from 'src/shared/components/ui/button';
import {
  CustomFieldsSection,
  type CustomFieldsSectionHandle,
} from 'src/shared/components/ui/custom-fields-section';
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

// ─── Minimal creation payload — matches backend POST opportunity ──────────────
export interface NewOpportunityPayload {
  title: string;
  amount?: number;
  expected_close_date?: string;
  stage_uid?: string;
  description?: string;
  currency?: string;
  email?: string;
  entity_type?: string;
  entity_uid?: string;
}

interface EditOpportunityData {
  uid: string;
  title: string;
  amount: number;
  stage_uid: string;
  expected_close_date: string;
  description?: string;
  email?: string;
  custom_fields?: {
    custom_field_uid: string;
    key: string;
    label: string;
    type: string;
    value: unknown;
  }[];
}

interface NewOpportunityDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewOpportunityPayload) => Promise<{ uid: string } | void> | void;
  stages: PipelineStage[];
  /** Edit mode — pre-populates form with existing opportunity data */
  isEditing?: boolean;
  editingData?: EditOpportunityData | null;
}

export function NewOpportunityDrawer({
  open,
  onClose,
  onSave,
  stages,
  isEditing = false,
  editingData = null,
}: NewOpportunityDrawerProps) {
  const activeStages = stages.filter((s) => s.is_active && !s.is_won && !s.is_lost);
  const defaultStageUid = activeStages[0]?.uid ?? '';

  // Initialize form from editing data — runs once per drawer open via key remount
  const initialForm =
    isEditing && editingData
      ? {
          title: editingData.title || '',
          amount: editingData.amount ? String(editingData.amount) : '',
          stage_uid: editingData.stage_uid || defaultStageUid,
          expected_close_date: editingData.expected_close_date || '',
          description: editingData.description || '',
          email: editingData.email || '',
        }
      : {
          title: '',
          amount: '',
          stage_uid: defaultStageUid,
          expected_close_date: '',
          description: '',
          email: '',
        };

  const customFieldsRef = useRef<CustomFieldsSectionHandle>(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(
    Object.fromEntries((editingData?.custom_fields ?? []).map((f) => [f.custom_field_uid, f.value]))
  );
  const [isSaving, setIsSaving] = useState(false);

  const stageOptions = activeStages.map((s) => ({
    value: s.uid,
    label: s.name,
  }));

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'El nombre es requerido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Formato de correo inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (customFieldsRef.current && !customFieldsRef.current.validate()) return;
    setIsSaving(true);

    try {
      const defaultCloseDate = new Date();
      defaultCloseDate.setDate(defaultCloseDate.getDate() + 30);

      const payload: NewOpportunityPayload = {
        title: form.title.trim(),
        amount: Number(form.amount) || 0,
        expected_close_date:
          form.expected_close_date || defaultCloseDate.toISOString().split('T')[0],
        stage_uid: form.stage_uid || activeStages[0]?.uid,
        description: form.description.trim() || undefined,
        email: form.email.trim() || undefined,
      };

      if (isEditing && editingData) {
        payload.entity_type = 'opportunity';
        payload.entity_uid = editingData.uid;
      }

      const result = await Promise.resolve(onSave(payload));
      const entityUid = isEditing ? editingData?.uid : result?.uid;
      if (entityUid && Object.keys(customFieldValues).length > 0) {
        await customFieldsService.saveAll(entityUid, 'opportunities', customFieldValues);
      }
      onClose();
    } catch {
      // error handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[540px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <SheetTitle className="text-h6">
            {isEditing ? 'Editar Lead / Oportunidad' : 'Crear Nuevo Lead u Oportunidad'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Actualiza la información del lead u oportunidad.'
              : 'Registra una nueva posibilidad de venta en tu pipeline comercial.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  1
                </span>
                Información del Lead
              </h3>

              <Input
                label="Nombre del Cliente o Empresa"
                required
                placeholder="Ej: John Doe / TechNova S.A."
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                error={errors.title}
                autoFocus
              />

              <Input
                label="Correo electrónico (Opcional)"
                type="email"
                placeholder="contacto@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                error={errors.email}
              />
            </div>

            <hr className="border-border/40" />

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                  2
                </span>
                Interés y Contexto
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Etapa Inicial"
                  required
                  options={stageOptions}
                  value={form.stage_uid}
                  onChange={(v) => setForm((p) => ({ ...p, stage_uid: v as string }))}
                />
                <Input
                  label="Monto Estimado (Opcional)"
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  leftIcon={<span className="text-sm text-muted-foreground">$</span>}
                />
              </div>

              <Input
                label="Fecha esperada de cierre (Opcional)"
                type="date"
                value={form.expected_close_date}
                onChange={(e) => setForm((p) => ({ ...p, expected_close_date: e.target.value }))}
              />

              <Textarea
                label="Notas / Descripción (Opcional)"
                placeholder="Ej: Nos escribió por Instagram preguntando por licencias..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-muted/30 focus:bg-background transition-colors pt-2"
              />
            </div>

            <CustomFieldsSection
              ref={customFieldsRef}
              module="opportunities"
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border/40 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={isSaving} className="flex-1">
            {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar Lead'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
