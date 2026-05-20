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
import { MODULE_LABELS } from 'src/shared/constants/module-labels';

import { usePermissions } from '../../hooks/use-roles';
import type { Permission, Role } from '../../types/settings.types';

type RoleSavePayload = {
  name: string;
  key: string;
  description: string;
  permission_uids: string[];
};

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  onSave: (data: RoleSavePayload) => Promise<boolean>;
}

function groupByModule(permissions: Permission[]): Map<string, Permission[]> {
  const groups = new Map<string, Permission[]>();
  for (const p of permissions) {
    const existing = groups.get(p.module);
    if (existing) {
      existing.push(p);
    } else {
      groups.set(p.module, [p]);
    }
  }
  return groups;
}

export const RoleDrawer: React.FC<RoleDrawerProps> = ({ isOpen, onClose, role, onSave }) => {
  const { modules } = useAuthContext();
  const { data: permissions = [], isLoading: isLoadingPerms } = usePermissions();

  // Filter permissions by tenant plan modules
  const allowedPermissions = useMemo(() => {
    if (!modules || modules.length === 0) return permissions;
    const allowedKeys = new Set<string>();
    modules.forEach((m) => m.permissions.forEach((p) => allowedKeys.add(`${m.key}.${p}`)));
    return permissions.filter((p) => allowedKeys.has(p.key));
  }, [permissions, modules]);

  const [name, setName] = useState(role?.name ?? '');
  const [key, setKey] = useState(role?.key ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedUids, setSelectedUids] = useState<string[]>(role?.permission_uids ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(role?.name ?? '');
      setKey(role?.key ?? '');
      setDescription(role?.description ?? '');
      setSelectedUids(role?.permission_uids ?? []);
    }
  }, [isOpen, role]);

  const grouped = useMemo(() => groupByModule(allowedPermissions), [allowedPermissions]);

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
    const success = await onSave({ name, key, description, permission_uids: selectedUids });
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
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              label="Clave (key)"
              required
              placeholder="Ej. gerente_zona"
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
                  {[...grouped.entries()].map(([module, modulePerms]) => {
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
                                    <span className="text-sm font-medium text-foreground capitalize block">
                                      {perm.action}
                                    </span>
                                    {perm.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {perm.description}
                                      </p>
                                    )}
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
            onClick={handleSave}
            disabled={!name.trim() || !key.trim() || isSubmitting || isLoadingPerms}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
