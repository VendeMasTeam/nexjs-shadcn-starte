'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
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

import type { PlatformPermission, PlatformRole, PlatformRolePayload } from '../types/admin.types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  key: z
    .string()
    .min(1, 'Requerido')
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y _'),
  description: z.string().optional(),
  permission_uids: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

const DEFAULTS: RoleFormData = { name: '', key: '', description: '', permission_uids: [] };

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  role: PlatformRole | null;
  permissions: PlatformPermission[];
  onClose: () => void;
  onCreate: (data: PlatformRolePayload) => Promise<void>;
  onUpdate: (uid: string, data: Partial<PlatformRolePayload>) => Promise<void>;
}

export function PlatformRoleFormDrawer({
  open,
  role,
  permissions,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEditing = !!role;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<RoleFormData>({ resolver: zodResolver(roleSchema), defaultValues: DEFAULTS });

  const selectedUids = useWatch({ control, name: 'permission_uids' });

  useEffect(() => {
    if (open) {
      reset(
        role
          ? {
              name: role.name,
              key: role.key,
              description: role.description ?? '',
              permission_uids: role.permissions.map((p) => p.uid),
            }
          : DEFAULTS
      );
    }
  }, [open, role, reset]);

  // Group permissions by module
  const grouped = useMemo(() => {
    const map = new Map<string, PlatformPermission[]>();
    for (const p of permissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const toggle = (uid: string) => {
    setValue(
      'permission_uids',
      selectedUids.includes(uid) ? selectedUids.filter((x) => x !== uid) : [...selectedUids, uid]
    );
  };

  const onSubmit = async (data: RoleFormData) => {
    if (isEditing) {
      await onUpdate(role.uid, {
        name: data.name,
        description: data.description,
        permission_uids: data.permission_uids,
      });
    } else {
      await onCreate(data);
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <SheetTitle>{isEditing ? `Editar: ${role.name}` : 'Nuevo Rol'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modificá el rol de plataforma' : 'Creá un nuevo rol de plataforma'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
            <div className="space-y-3">
              <FormInput
                control={control}
                name="name"
                label="Nombre"
                required
                placeholder="Ej. Soporte N1"
              />
              <FormInput
                control={control}
                name="key"
                label="Clave (key)"
                required
                placeholder="Ej. support_n1"
                disabled={isEditing}
              />
              <FormInput
                control={control}
                name="description"
                label="Descripción"
                placeholder="Descripción del rol"
              />
            </div>

            {grouped.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Permisos</h3>
                <div className="space-y-5">
                  {grouped.map(([module, perms]) => (
                    <div key={module}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {module}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {perms.map((p) => (
                          <div key={p.uid} className="flex items-start gap-2.5">
                            <Checkbox
                              id={p.uid}
                              checked={selectedUids.includes(p.uid)}
                              onCheckedChange={() => toggle(p.uid)}
                              className="mt-0.5"
                            />
                            <label htmlFor={p.uid} className="text-sm cursor-pointer leading-snug">
                              <span className="font-medium">{p.action}</span>
                              {p.description && (
                                <span className="block text-xs text-muted-foreground">
                                  {p.description}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
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
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
