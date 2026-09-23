'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { cn } from 'src/lib/utils';
import { Accordion, AccordionContent, AccordionItem } from 'src/shared/components/ui/accordion';
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { FormInput } from 'src/shared/components/ui/form-input';
import { Icon } from 'src/shared/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { MODULE_LABELS } from 'src/shared/constants/module-labels';
import { z } from 'zod';

import type { PlatformPermission, PlatformRole, PlatformRolePayload } from '../types/admin.types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  description: z.string().optional(),
  permission_uids: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

const DEFAULTS: RoleFormData = { name: '', description: '', permission_uids: [] };

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
              description: role.description ?? '',
              permission_uids: (role.permissions ?? []).map((p) => p.uid),
            }
          : DEFAULTS
      );
    }
  }, [open, role, reset]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformPermission[]>();
    for (const p of permissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const toggleUid = (uid: string) => {
    setValue(
      'permission_uids',
      selectedUids.includes(uid) ? selectedUids.filter((x) => x !== uid) : [...selectedUids, uid]
    );
  };

  const toggleModule = (
    modulePerms: PlatformPermission[],
    selectedCount: number,
    total: number
  ) => {
    const uids = modulePerms.map((p) => p.uid);
    setValue(
      'permission_uids',
      selectedCount === total
        ? selectedUids.filter((u) => !uids.includes(u))
        : [...new Set([...selectedUids, ...uids])]
    );
  };

  const toggleAll = (checked: boolean) => {
    setValue('permission_uids', checked ? permissions.map((p) => p.uid) : []);
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
      <SheetContent side="right" className="w-full sm:max-w-[640px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/40 bg-muted/30">
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
                name="description"
                label="Descripción"
                placeholder="Descripción del rol"
              />
            </div>

            {permissions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">
                    Permisos
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedUids.length} seleccionado{selectedUids.length !== 1 ? 's' : ''}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={
                          permissions.length > 0 && selectedUids.length === permissions.length
                        }
                        onCheckedChange={(checked) => toggleAll(!!checked)}
                      />
                      <span className="text-xs text-muted-foreground">Todos</span>
                    </label>
                  </div>
                </div>

                <Accordion
                  type="multiple"
                  className="border border-border rounded-lg divide-y divide-border/60"
                >
                  {grouped.map(([module, modulePerms]) => {
                    const selectedCount = modulePerms.filter((p) =>
                      selectedUids.includes(p.uid)
                    ).length;
                    const totalCount = modulePerms.length;
                    const allSelected = selectedCount === totalCount;
                    const moduleLabel = MODULE_LABELS[module] ?? module;

                    return (
                      <AccordionItem key={module} value={module} className="border-0">
                        <AccordionPrimitive.Header className="flex items-center px-4 hover:bg-muted/30 transition-colors">
                          <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2 py-3 text-left outline-none [&[data-state=open]>svg]:rotate-180">
                            <Icon
                              name="ChevronDown"
                              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                            />
                            <span className="text-sm font-medium">{moduleLabel}</span>
                            <span
                              className={cn(
                                'text-xs rounded-full px-2 py-0.5 font-medium',
                                selectedCount > 0
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {selectedCount}/{totalCount}
                            </span>
                          </AccordionPrimitive.Trigger>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={
                                allSelected ? true : selectedCount > 0 ? 'indeterminate' : false
                              }
                              onCheckedChange={() =>
                                toggleModule(modulePerms, selectedCount, totalCount)
                              }
                            />
                          </div>
                        </AccordionPrimitive.Header>

                        <AccordionContent className="pb-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-4 pb-3">
                            {modulePerms.map((perm) => {
                              const isChecked = selectedUids.includes(perm.uid);
                              return (
                                <label
                                  key={perm.uid}
                                  className={cn(
                                    'flex items-start gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors',
                                    isChecked ? 'bg-primary/5' : 'hover:bg-muted/30'
                                  )}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleUid(perm.uid)}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    {/* description es el texto humano que manda backend (ej: "Administrar
                                        alertas globales") — perm.action solo no alcanza como label: para
                                        plans.manage, action es literalmente "manage", sin contexto */}
                                    <span className="text-sm font-medium text-foreground block">
                                      {perm.description || perm.key}
                                    </span>
                                    <p className="text-xs text-muted-foreground line-clamp-1 font-mono">
                                      {perm.key}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
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
