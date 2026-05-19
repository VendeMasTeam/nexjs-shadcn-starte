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

import { projectsService } from '../services/projects.service';
import type { ProjectResourcePayload, ResourceRole } from '../types';

const ROLE_OPTIONS: { value: ResourceRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'consultant', label: 'Consultor' },
  { value: 'technician', label: 'Técnico' },
  { value: 'support', label: 'Soporte' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAssign: (resource: ProjectResourcePayload) => Promise<boolean>;
}

export function ResourceDrawer({ open, onClose, onAssign }: Props) {
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [role, setRole] = useState<ResourceRole>('consultant');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const { data: roleOptionsData } = useQuery({
    queryKey: ['projects', 'resource-roles'],
    queryFn: () => projectsService.getResourceRoles(),
    staleTime: 0,
  });

  const resolvedRoleOptions = (roleOptionsData?.length ?? 0) > 0 ? roleOptionsData! : ROLE_OPTIONS;

  const reset = () => {
    setSelectedConsultant('');
    setRole('consultant');
    setStartDate('');
    setEndDate('');
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedConsultant) errs.consultant = 'Selecciona un recurso';
    if (!startDate) errs.startDate = 'La fecha de inicio es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAssign = async () => {
    if (!validate()) return;
    setLoading(true);

    const selectedUser = userOptions.find((u) => u.value === selectedConsultant);
    const payload: ProjectResourcePayload = {
      name: selectedUser?.label ?? '',
      role,
      email: '',
      start_date: startDate,
      end_date: endDate || undefined,
    };

    const ok = await onAssign(payload);
    if (ok) notify.success('Recurso asignado al proyecto');
    else notify.error('Error al asignar el recurso');

    setLoading(false);
    handleClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-sm flex flex-col overflow-y-auto">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>Asignar recurso</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <SelectField
            label="Persona"
            required
            searchable
            options={userOptions}
            value={selectedConsultant}
            onChange={(v) => setSelectedConsultant(v as string)}
            placeholder="Selecciona un consultor/técnico"
            error={errors.consultant}
          />

          <SelectField
            label="Rol en el proyecto"
            required
            options={resolvedRoleOptions}
            value={role}
            onChange={(v) => setRole(v as ResourceRole)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fecha inicio *"
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={errors.startDate}
            />
            <Input
              label="Fecha fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleAssign} disabled={loading}>
            {loading ? 'Asignando...' : 'Asignar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
