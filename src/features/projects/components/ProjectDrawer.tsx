'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { contactsService } from 'src/features/contacts/services/contacts.service';
import axiosInstance, { endpoints } from 'src/lib/axios';
import {
  Button,
  ConfirmDialog,
  Input,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';
import { Textarea } from 'src/shared/components/ui';
import { useProjectStatusOptions } from 'src/shared/hooks/use-status-options';
import { useDebounce } from 'use-debounce';

import type { Project, ProjectPayload, ProjectStatus } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  project?: Project | null;
  onClose: () => void;
  onCreate: (data: ProjectPayload) => Promise<boolean>;
  onUpdate: (uid: string, changes: Partial<ProjectPayload>) => Promise<boolean>;
  onCancel?: (uid: string) => void;
}

interface FormProps {
  project?: Project | null;
  isEdit: boolean;
  onClose: () => void;
  onCreate: (data: ProjectPayload) => Promise<boolean>;
  onUpdate: (uid: string, changes: Partial<ProjectPayload>) => Promise<boolean>;
  onCancel?: (uid: string) => void;
}

function ProjectForm({ project, isEdit, onClose, onCreate, onUpdate, onCancel }: FormProps) {
  const init = isEdit && project;
  const [name, setName] = useState(init ? project.name : '');
  const [clientId, setClientId] = useState(init ? project.client_uid : '');
  const [clientSearch, setClientSearch] = useState('');
  const [manager, setManager] = useState(init ? project.manager : '');
  const [managerSearch, setManagerSearch] = useState('');
  const [debouncedManagerSearch] = useDebounce(managerSearch, 300);
  const [status, setStatus] = useState<ProjectStatus>(init ? project.status : 'planning');
  const { data: statusOptions = [] } = useProjectStatusOptions();
  const [startDate, setStartDate] = useState(init ? project.start_date : '');
  const [endDate, setEndDate] = useState(init ? project.end_date : '');
  const [description, setDescription] = useState(init ? (project.description ?? '') : '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // ── Account search (GET /accounts?search=) ─────────────────────────────
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'search', clientSearch],
    queryFn: async () => {
      const res = await contactsService.accounts.list({
        page: 1,
        per_page: 20,
        search: clientSearch || undefined,
      });
      return (res as Record<string, unknown>).data as Array<{ uid: string; name: string }>;
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const accountOptions = useMemo(
    () =>
      (accountsData ?? []).map((a) => ({
        value: a.uid,
        label: a.name,
      })),
    [accountsData]
  );

  // ── User search (GET /users?search=) for manager selector ─────────────
  const { data: usersData } = useQuery({
    queryKey: ['users', 'search', debouncedManagerSearch],
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.users.list, {
        params: {
          per_page: 20,
          ...(debouncedManagerSearch ? { search: debouncedManagerSearch } : {}),
        },
      });
      return (res.data?.data ?? []) as { uid: string; name: string }[];
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const userOptions = useMemo(
    () =>
      (usersData ?? []).map((u) => ({
        value: u.name,
        label: u.name,
      })),
    [usersData]
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es requerido';
    if (!clientId) errs.clientId = 'El cliente es requerido';
    if (!manager) errs.manager = 'Selecciona un manager';
    if (!startDate) errs.startDate = 'La fecha de inicio es requerida';
    if (!endDate) errs.endDate = 'La fecha de fin estimado es requerida';
    if (startDate && endDate && startDate > endDate)
      errs.endDate = 'La fecha fin debe ser posterior al inicio';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    const payload: ProjectPayload = {
      name,
      client_uid: clientId,
      client_name: clientId,
      manager,
      status,
      start_date: startDate,
      end_date: endDate,
      description,
    };

    if (isEdit && project) {
      await onUpdate(project.uid, payload);
    } else {
      await onCreate(payload);
    }

    setLoading(false);
    onClose();
  };

  const handleCancel = () => {
    if (project && onCancel) {
      setCancelDialogOpen(true);
    }
  };

  const showDangerZone =
    isEdit && project && project.status !== 'completed' && project.status !== 'cancelled';

  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle>{isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <Input
          label="Nombre del proyecto"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Onboarding ERP — Cliente XYZ"
          error={errors.name}
        />

        <SelectField
          label="Cliente"
          required
          searchable
          options={accountOptions}
          value={clientId}
          onChange={(v) => {
            setClientId(v as string);
            setErrors((p) => ({ ...p, clientId: '' }));
          }}
          onSearch={setClientSearch}
          error={errors.clientId}
        />

        <SelectField
          label="Manager responsable"
          required
          searchable
          options={userOptions}
          value={manager}
          onChange={(v) => {
            setManager(v as string);
            setErrors((p) => ({ ...p, manager: '' }));
          }}
          onSearch={setManagerSearch}
          placeholder="Selecciona un manager"
          error={errors.manager}
        />

        <SelectField
          label="Estado"
          required
          options={statusOptions}
          value={status}
          onChange={(v) => setStatus(v as ProjectStatus)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha inicio"
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.startDate}
          />
          <Input
            label="Fin estimado"
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
          />
        </div>

        <Textarea
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contexto del proyecto, objetivos principales..."
          rows={3}
        />

        {showDangerZone && (
          <div className="rounded-xl border border-error/20 p-4 bg-error/5">
            <p className="text-subtitle2 text-error font-medium mb-1">Zona de peligro</p>
            <p className="text-caption text-muted-foreground mb-3">
              Cancelar el proyecto lo cerrará permanentemente.
            </p>
            <Button variant="outline" color="error" size="sm" onClick={handleCancel}>
              Cancelar proyecto
            </Button>
          </div>
        )}
      </div>

      <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </SheetFooter>
      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => {
          if (project) onCancel!(project.uid);
          setCancelDialogOpen(false);
          onClose();
        }}
        title="Cancelar proyecto"
        description="¿Estás seguro? El proyecto se cerrará permanentemente. Esta acción no se puede deshacer."
        confirmLabel="Cancelar proyecto"
        variant="error"
      />
    </>
  );
}

export function ProjectDrawer({
  open,
  mode,
  project,
  onClose,
  onCreate,
  onUpdate,
  onCancel,
}: Props) {
  const isEdit = mode === 'edit';
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <ProjectForm
          key={`${open}-${project?.uid ?? 'new'}`}
          project={project}
          isEdit={isEdit}
          onClose={onClose}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onCancel={onCancel}
        />
      </SheetContent>
    </Sheet>
  );
}
