'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { usersService } from 'src/features/settings/services/users.service';
import { notify } from 'src/lib/notify';
import {
  Button,
  Input,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';
import { Textarea } from 'src/shared/components/ui';
import { useMilestoneStatusOptions } from 'src/shared/hooks/use-status-options';

import type { Milestone, MilestonePayload, MilestoneStatus } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  milestone?: Milestone | null;
  onClose: () => void;
  onSave: (data: MilestonePayload) => Promise<boolean>;
}

interface FormProps {
  milestone?: Milestone | null;
  isEdit: boolean;
  onClose: () => void;
  onSave: (data: MilestonePayload) => Promise<boolean>;
}

function MilestoneForm({ milestone, isEdit, onClose, onSave }: FormProps) {
  const init = isEdit && milestone;
  const [name, setName] = useState(init ? milestone.name : '');
  const [description, setDescription] = useState(init ? (milestone.description ?? '') : '');
  const [assignedToUid, setAssignedToUid] = useState(init ? (milestone.assigned_to_uid ?? '') : '');
  const [dueDate, setDueDate] = useState(init ? milestone.due_date : '');
  const [status, setStatus] = useState<MilestoneStatus>(init ? milestone.status : 'pending');
  const { data: statusOptions = [] } = useMilestoneStatusOptions();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await usersService.getAll({ per_page: 500 });
      return (
        ((res as Record<string, unknown>).data ?? []) as Array<{ uid: string; name: string }>
      ).map((u) => ({ value: u.uid, label: u.name }));
    },
    staleTime: 0,
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es requerido';
    if (!assignedToUid) errs.assignedTo = 'El responsable es requerido';
    if (!dueDate) errs.dueDate = 'La fecha límite es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    const payload: MilestonePayload = {
      name,
      description,
      due_date: dueDate,
      status,
      assigned_to_uid: assignedToUid,
      assigned_to_name: userOptions.find((u) => u.value === assignedToUid)?.label ?? '',
    };

    const ok = await onSave(payload);
    if (ok) notify.success(isEdit ? 'Hito actualizado' : 'Hito agregado');
    else notify.error(isEdit ? 'Error al actualizar el hito' : 'Error al agregar el hito');

    setLoading(false);
    onClose();
  };

  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle>{isEdit ? 'Editar hito' : 'Nuevo hito'}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <Input
          label="Nombre del hito"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Kick-off con el cliente"
          error={errors.name}
        />

        <Textarea
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles del hito (opcional)..."
          rows={2}
        />

        <SelectField
          label="Responsable"
          required
          searchable
          options={userOptions}
          value={assignedToUid}
          onChange={(v) => setAssignedToUid(v as string)}
          error={errors.assignedTo}
        />

        <Input
          label="Fecha límite *"
          required
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={errors.dueDate}
        />

        <SelectField
          label="Estado *"
          required
          options={statusOptions}
          value={status}
          onChange={(v) => setStatus(v as MilestoneStatus)}
        />
      </div>

      <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </SheetFooter>
    </>
  );
}

export function MilestoneDrawer({ open, mode, milestone, onClose, onSave }: Props) {
  const isEdit = mode === 'edit';
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-sm flex flex-col overflow-y-auto">
        <MilestoneForm
          key={`${open}-${milestone?.uid ?? 'new'}`}
          milestone={milestone}
          isEdit={isEdit}
          onClose={onClose}
          onSave={onSave}
        />
      </SheetContent>
    </Sheet>
  );
}
