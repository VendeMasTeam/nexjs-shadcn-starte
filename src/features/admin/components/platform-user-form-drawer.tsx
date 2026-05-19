'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from 'src/shared/components/ui/button';
import { FormInput } from 'src/shared/components/ui/form-input';
import { FormSelectField } from 'src/shared/components/ui/form-select-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { z } from 'zod';

import type { PlatformRole, PlatformUser, PlatformUserPayload } from '../types/admin.types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role_uid: z.string().min(1, 'Requerido'),
  status: z.enum(['ACTIVO', 'INACTIVO']),
});

const editSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
  role_uid: z.string().min(1, 'Requerido'),
  status: z.enum(['ACTIVO', 'INACTIVO']),
});

type UserFormData = z.infer<typeof editSchema>;

const DEFAULTS: UserFormData = {
  name: '',
  email: '',
  password: '',
  role_uid: '',
  status: 'ACTIVO',
};

const STATUS_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  user: PlatformUser | null;
  roles: PlatformRole[];
  onClose: () => void;
  onCreate: (data: PlatformUserPayload) => Promise<void>;
  onUpdate: (uid: string, data: Partial<PlatformUserPayload>) => Promise<void>;
}

export function PlatformUserFormDrawer({ open, user, roles, onClose, onCreate, onUpdate }: Props) {
  const isEditing = !!user;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? {
              name: user.name,
              email: user.email,
              password: '',
              role_uid: user.role_uid,
              status: user.status === 'BLOQUEADO' ? 'INACTIVO' : user.status,
            }
          : DEFAULTS
      );
    }
  }, [open, user, reset]);

  const roleOptions = roles.map((r) => ({ value: r.uid, label: r.name }));

  const onSubmit = async (data: UserFormData) => {
    if (isEditing) {
      const payload: Partial<PlatformUserPayload> = {
        name: data.name,
        email: data.email,
        role_uid: data.role_uid,
        status: data.status,
      };
      if (data.password) payload.password = data.password;
      await onUpdate(user.uid, payload);
    } else {
      await onCreate({
        name: data.name,
        email: data.email,
        password: data.password!,
        role_uid: data.role_uid,
        status: data.status,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <SheetTitle>{isEditing ? `Editar: ${user.name}` : 'Nuevo Usuario'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modificá los datos del usuario' : 'Creá un nuevo usuario de plataforma'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
            <FormInput
              control={control}
              name="name"
              label="Nombre"
              required
              placeholder="Nombre completo"
            />
            <FormInput
              control={control}
              name="email"
              label="Email"
              required
              type="email"
              placeholder="usuario@plataforma.com"
            />
            <FormInput
              control={control}
              name="password"
              label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              required={!isEditing}
              placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
            />
            <FormSelectField
              control={control}
              name="role_uid"
              label="Rol"
              options={roleOptions}
              placeholder="Seleccioná un rol"
            />
            <FormSelectField
              control={control}
              name="status"
              label="Estado"
              options={STATUS_OPTIONS}
            />
          </div>

          <SheetFooter className="border-t border-border/40 px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
