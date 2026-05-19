import React, { useState } from 'react';
import { cn } from 'src/lib/utils';
import { Button } from 'src/shared/components/ui/button';
import { ColorSwatchPicker, type SwatchColor } from 'src/shared/components/ui/color-swatch-picker';
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

import type { Tag, TagColor, TagEntity, TagForm } from '../../types/tags.types';

const TAG_COLORS: SwatchColor[] = [
  { value: 'blue', label: 'Azul', dotClassName: 'bg-blue-500' },
  { value: 'red', label: 'Rojo', dotClassName: 'bg-red-500' },
  { value: 'green', label: 'Verde', dotClassName: 'bg-green-500' },
  { value: 'yellow', label: 'Amarillo', dotClassName: 'bg-yellow-400' },
  { value: 'purple', label: 'Morado', dotClassName: 'bg-purple-500' },
  { value: 'orange', label: 'Naranja', dotClassName: 'bg-orange-500' },
  { value: 'slate', label: 'Gris', dotClassName: 'bg-slate-500' },
  { value: 'pink', label: 'Rosa', dotClassName: 'bg-pink-500' },
];

const ENTITIES: { value: TagEntity; label: string }[] = [
  { value: 'CONTACT', label: 'Contactos' },
  { value: 'COMPANY', label: 'Empresas' },
  { value: 'LEAD', label: 'Prospectos' },
  { value: 'DEAL', label: 'Negocios' },
];

interface TagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag | null;
  onSave: (form: TagForm) => Promise<boolean>;
}

export const TagDrawer: React.FC<TagDrawerProps> = ({ isOpen, onClose, tag, onSave }) => {
  const [name, setName] = useState(tag?.name ?? '');
  const [color, setColor] = useState<TagColor>((tag?.color as TagColor) ?? 'blue');
  const [entities, setEntities] = useState<TagEntity[]>(tag?.entity_types ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEntity = (entity: TagEntity) => {
    setEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || entities.length === 0) return;
    setIsSubmitting(true);
    const success = await onSave({ name, color, entity_types: entities });
    setIsSubmitting(false);
    if (success) onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[440px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <SheetTitle>{tag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}</SheetTitle>
          <SheetDescription>
            Personaliza el color y en qué entidades estará disponible.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
          <Input
            label="Nombre de la etiqueta"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. VIP, Lista Negra, Referido..."
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Color *</p>
            <ColorSwatchPicker
              value={color}
              onChange={(v) => setColor(v)}
              colors={TAG_COLORS}
              allowCustom
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Disponible en *</p>
            <div className="grid grid-cols-2 gap-3">
              {ENTITIES.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => toggleEntity(e.value)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border flex items-center gap-2 transition-colors cursor-pointer',
                    entities.includes(e.value)
                      ? 'bg-primary/10 border-primary text-primary font-medium'
                      : 'bg-transparent border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0',
                      entities.includes(e.value)
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {entities.includes(e.value) && <Icon name="Check" size={12} />}
                  </div>
                  {e.label}
                </button>
              ))}
            </div>
            {entities.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Selecciona al menos una entidad.</p>
            )}
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border/40 bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            color="primary"
            onClick={handleSave}
            disabled={!name.trim() || entities.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Etiqueta'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
