'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
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
import { useUserStatusOptions } from 'src/shared/hooks/use-status-options';
import { useDebounce } from 'use-debounce';
import { z } from 'zod';

import { useRoles } from '../../hooks/use-roles';
import { useTeams } from '../../hooks/use-teams';
import type { SettingsUser, UserStatus } from '../../types/settings.types';

const schema = z.object({
  name: z.string().min(2, 'Requerido'),
  email: z.string().email('Email inválido'),
  role_uid: z.string().optional(),
  role_name: z.string().optional(),
  team_uid: z.string().optional(),
  team_name: z.string().optional(),
  password: z.string().optional(),
  status: z.enum(['ACTIVO', 'INACTIVO']),
});

type UserForm = z.infer<typeof schema>;

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: SettingsUser | null;
  onSave: (
    data: Omit<SettingsUser, 'uid' | 'created_at' | 'last_login_at'> & {
      password?: string;
      role_uid?: string;
    }
  ) => Promise<boolean>;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({ isOpen, onClose, user, onSave }) => {
  const { data: statusOptions = [] } = useUserStatusOptions();

  // Búsqueda server-side de rol/equipo — el rol/equipo ya asignado al usuario se
  // cachea con su label (viene denormalizado en `user.role_name`/`team_name`) para
  // que no desaparezca del combo si queda fuera de la búsqueda actual.
  const [roleSearch, setRoleSearch] = useState('');
  const [debouncedRoleSearch] = useDebounce(roleSearch, 400);
  const { roles } = useRoles({ search: debouncedRoleSearch || undefined });

  const [teamSearch, setTeamSearch] = useState('');
  const [debouncedTeamSearch] = useDebounce(teamSearch, 400);
  const { teams: equipos } = useTeams(debouncedTeamSearch);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { status: 'ACTIVO' },
  });

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          role_uid: user.role_uid,
          team_uid: user.team_uid ?? '',
          status: user.status,
        });
      } else {
        reset({ name: '', email: '', role_uid: '', team_uid: '', password: '', status: 'ACTIVO' });
      }
    }
  }, [isOpen, user, reset]);

  const onSubmit = async (data: UserForm) => {
    const role = roles.find((r) => r.uid === data.role_uid);
    const equipo = equipos.find((e) => e.uid === data.team_uid);
    const success = await onSave({
      name: data.name,
      email: data.email,
      role_uid: data.role_uid,
      role_name: role?.name ?? '',
      team_uid: data.team_uid || undefined,
      team_name: equipo?.name || undefined,
      password: data.password || undefined,
      status: data.status as UserStatus,
    });
    if (success) onClose();
  };

  const roleOptions = (() => {
    const base = roles.map((r) => ({ value: r.uid, label: r.name }));
    if (user?.role_uid && user.role_name && !base.find((o) => o.value === user.role_uid)) {
      return [{ value: user.role_uid, label: user.role_name }, ...base];
    }
    return base;
  })();

  const equipoOptions = (() => {
    const base = [
      { value: '', label: 'Sin equipo' },
      ...equipos.map((e) => ({ value: e.uid, label: e.name })),
    ];
    if (user?.team_uid && user.team_name && !base.find((o) => o.value === user.team_uid)) {
      return [{ value: user.team_uid, label: user.team_name }, ...base];
    }
    return base;
  })();

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[440px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <SheetTitle>{user ? 'Editar Usuario' : 'Invitar Usuario'}</SheetTitle>
          <SheetDescription>
            {user
              ? 'Actualiza el rol y equipo del usuario'
              : 'Completa los datos del nuevo usuario'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-5">
            <FormInput
              control={control}
              name="name"
              label="Nombre completo"
              required
              placeholder="Ej. Carlos Mendoza"
            />

            <FormInput
              control={control}
              name="email"
              type="email"
              label="Email"
              required
              placeholder="carlos@empresa.com"
              disabled={!!user}
            />

            {!user && (
              <FormInput
                control={control}
                name="password"
                type="password"
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
              />
            )}

            <FormSelectField
              control={control}
              name="role_uid"
              label="Rol"
              searchable
              onSearch={setRoleSearch}
              options={roleOptions}
              placeholder="Seleccionar rol..."
            />

            <FormSelectField
              control={control}
              name="team_uid"
              label="Equipo"
              searchable
              onSearch={setTeamSearch}
              options={equipoOptions}
            />

            <FormSelectField
              control={control}
              name="status"
              label="Estado"
              options={statusOptions}
            />
          </div>
        </div>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : user ? 'Guardar cambios' : 'Invitar usuario'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
