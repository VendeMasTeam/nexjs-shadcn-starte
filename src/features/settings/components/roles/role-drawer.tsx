'use client';

import { Accordion as AccordionPrimitive } from 'radix-ui';
import React, { useMemo, useState } from 'react';
import { cn } from 'src/lib/utils';
import { useAuthContext } from 'src/shared/auth/hooks/use-auth-context';
import { Accordion, AccordionContent, AccordionItem } from 'src/shared/components/ui/accordion';
import { Button } from 'src/shared/components/ui/button';
import { Checkbox } from 'src/shared/components/ui/checkbox';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';
import { Textarea } from 'src/shared/components/ui/textarea';

import { usePermissions } from '../../hooks/use-roles';
import type { Permission, Role } from '../../types/settings.types';

type RoleSavePayload = {
  name: string;
  description: string;
  permission_uids: string[];
};

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: (data: RoleSavePayload) => Promise<boolean>;
}

type AreaGroup = { key: string; label: string; perms: Permission[] };

export const RoleDrawer: React.FC<RoleDrawerProps> = ({ isOpen, onClose, role, onSave }) => {
  const { modules } = useAuthContext();
  const { data: permissions = [], isLoading: isLoadingPerms } = usePermissions();

  // Agrupamos por ÁREA DE PRODUCTO (Ventas, CRM...), no por módulo RBAC crudo
  // (quotations, contacts...) — el usuario de negocio piensa en "dame todo Ventas",
  // no en entidades técnicas. permission_modules (mandado por backend) es el mapeo
  // área → módulos RBAC reales que cubre, porque modules[].key (ej: "sales") y
  // permission.module (ej: "quotations") son vocabularios distintos, no matchean 1:1.
  // scope 'tenant': defensa en profundidad, backend ya filtra /rbac/permissions.
  const areaGroups = useMemo<AreaGroup[]>(() => {
    const tenantScoped = permissions.filter((p) => p.scope !== 'platform');
    return (modules ?? [])
      .filter((m) => m.enabled)
      .map((m) => ({
        key: m.key,
        label: m.label,
        perms: tenantScoped.filter((p) => (m.permission_modules ?? []).includes(p.module)),
      }))
      .filter((g) => g.perms.length > 0);
  }, [permissions, modules]);

  // Un mismo permiso puede aparecer en más de un área (ej: products.read vive tanto
  // en Inventario como en Ventas) — se lista en las dos, pero para "Todos"/el contador
  // global cuenta una sola vez.
  const allowedPermissions = useMemo<Permission[]>(() => {
    const seen = new Map<string, Permission>();
    areaGroups.forEach((g) => g.perms.forEach((p) => seen.set(p.uid, p)));
    return [...seen.values()];
  }, [areaGroups]);

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedUids, setSelectedUids] = useState<string[]>(role?.permission_uids ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setSelectedUids(role?.permission_uids ?? []);
    }
  }, [isOpen, role]);

  const toggleUid = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  };

  const toggleModule = (modulePerms: Permission[], selectedCount: number, totalCount: number) => {
    const uids = modulePerms.map((p) => p.uid);
    setSelectedUids((prev) =>
      selectedCount === totalCount
        ? prev.filter((u) => !uids.includes(u))
        : [...new Set([...prev, ...uids])]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const success = await onSave({ name, description, permission_uids: selectedUids });
    setIsSubmitting(false);
    if (success) onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[640px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <SheetTitle>{role ? 'Editar Rol' : 'Nuevo Rol'}</SheetTitle>
          <SheetDescription>Define el nombre y los permisos del rol</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
          <div className="py-6 space-y-6">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              label="Nombre del rol"
              required
              placeholder="Ej. Gerente de Zona"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              label="Descripción"
              rows={2}
              placeholder="Describe brevemente este rol..."
            />

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
                        allowedPermissions.length > 0 &&
                        selectedUids.length === allowedPermissions.length
                      }
                      onCheckedChange={(checked) =>
                        setSelectedUids(checked ? allowedPermissions.map((p) => p.uid) : [])
                      }
                    />
                    <span className="text-xs text-muted-foreground">Todos</span>
                  </label>
                </div>
              </div>

              {isLoadingPerms ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/40 rounded-lg w-full" />
                  ))}
                </div>
              ) : (
                <Accordion
                  type="multiple"
                  className="border border-border rounded-lg divide-y divide-border/60"
                >
                  {areaGroups.map(({ key, label, perms: areaPerms }) => {
                    const selectedCount = areaPerms.filter((p) =>
                      selectedUids.includes(p.uid)
                    ).length;
                    const totalCount = areaPerms.length;
                    const allSelected = selectedCount === totalCount;

                    return (
                      <AccordionItem key={key} value={key} className="border-0">
                        <AccordionPrimitive.Header className="flex items-center px-4 hover:bg-muted/30 transition-colors">
                          <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2 py-3 text-left outline-none [&[data-state=open]>svg]:rotate-180">
                            <Icon
                              name="ChevronDown"
                              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                            />
                            <span className="text-sm font-medium">{label}</span>
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
                                toggleModule(areaPerms, selectedCount, totalCount)
                              }
                            />
                          </div>
                        </AccordionPrimitive.Header>

                        <AccordionContent className="pb-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-4 pb-3">
                            {areaPerms.map((perm) => {
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
                                    {/* description es el texto humano de backend; key completo abajo
                                        para desambiguar (ej: acciones "manage" sueltas sin contexto) */}
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
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/40 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            color="primary"
            onClick={handleSave}
            disabled={!name.trim() || isSubmitting || isLoadingPerms}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
