'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { FormInput } from 'src/shared/components/ui/form-input';
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
  admin_role_uids: z.array(z.string()),
});

const editSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
  admin_role_uids: z.array(z.string()),
});

type UserFormData = z.infer<typeof editSchema>;

const DEFAULTS: UserFormData = { name: '', email: '', password: '', admin_role_uids: [] };

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
    setValue,
    formState: { isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: DEFAULTS,
  });

  const selectedRoles = useWatch({ control, name: 'admin_role_uids' });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? {
              name: user.name,
              email: user.email,
              password: '',
              admin_role_uids: user.admin_roles.map((r) => r.uid),
            }
          : DEFAULTS
      );
    }
  }, [open, user, reset]);

  const toggleRole = (uid: string) => {
    setValue(
      'admin_role_uids',
      selectedRoles.includes(uid) ? selectedRoles.filter((x) => x !== uid) : [...selectedRoles, uid]
    );
  };

  const onSubmit = async (data: UserFormData) => {
    if (isEditing) {
      const payload: Partial<PlatformUserPayload> = {
        name: data.name,
        email: data.email,
        admin_role_uids: data.admin_role_uids,
      };
      if (data.password) payload.password = data.password;
      await onUpdate(user.uid, payload);
    } else {
      await onCreate({
        name: data.name,
        email: data.email,
        password: data.password!,
        admin_role_uids: data.admin_role_uids,
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
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

            {roles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Roles</p>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div key={r.uid} className="flex items-start gap-2.5">
                      <Checkbox
                        id={`role-${r.uid}`}
                        checked={selectedRoles.includes(r.uid)}
                        onCheckedChange={() => toggleRole(r.uid)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`role-${r.uid}`}
                        className="text-sm cursor-pointer leading-snug"
                      >
                        <span className="font-medium">{r.name}</span>
                        {r.description && (
                          <span className="block text-xs text-muted-foreground">
                            {r.description}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
