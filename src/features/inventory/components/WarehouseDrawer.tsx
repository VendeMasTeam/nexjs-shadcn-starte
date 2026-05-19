'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Icon,
  Input,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
} from 'src/shared/components/ui';

import type { CreateWarehousePayload, Warehouse } from '../types/inventory.types';

interface WarehouseDrawerProps {
  open: boolean;
  warehouse?: Warehouse | null;
  onClose: () => void;
  onSave: (payload: CreateWarehousePayload) => Promise<void>;
}

export function WarehouseDrawer({ open, warehouse, onClose, onSave }: WarehouseDrawerProps) {
  const [name, setName] = useState(warehouse?.name ?? '');
  const [code, setCode] = useState(warehouse?.code ?? '');
  const [location, setLocation] = useState(warehouse?.location ?? '');
  const [active, setActive] = useState(warehouse?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(warehouse?.name ?? '');
    setCode(warehouse?.code ?? '');
    setLocation(warehouse?.location ?? '');
    setActive(warehouse?.is_active ?? true);
    setErrors({});
  }, [open, warehouse]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'El nombre es requerido';
    if (!code.trim()) next.code = 'El código es requerido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ name, code, location: location || undefined, is_active: active });
      onClose();
    } catch {
      // error handled by MutationCache
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>{warehouse ? 'Editar bodega' : 'Nueva bodega'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <Input
            label="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Bodega Central"
            error={errors.name}
          />
          <Input
            label="Código *"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: MAIN, BCN01"
            error={errors.code}
          />
          <Input
            label="Ubicación"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej: Calle Falsa 123"
          />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium leading-none">Estado</p>
              <p className="text-caption text-muted-foreground mt-0.5">
                {active ? 'Activa' : 'Inactiva'}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={15} className="animate-spin" /> Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
