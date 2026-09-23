'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { brandingService } from 'src/features/admin/services/branding.service';
import { extractApiError } from 'src/lib/api-errors';
import { notify } from 'src/lib/notify';
import { queryKeys } from 'src/lib/query-keys';
import { Button, Input } from 'src/shared/components/ui';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';
import { useBranding } from 'src/shared/hooks/use-branding';

type SlotKey = 'logo_light' | 'logo_dark' | 'favicon';

type ImageSlotProps = {
  label: string;
  hint: string;
  currentUrl: string | null | undefined;
  file: File | null;
  removed: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

function ImageSlot({ label, hint, currentUrl, file, removed, onSelect, onRemove }: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? (removed ? null : currentUrl);

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="size-20 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt={label} className="max-w-full max-h-full object-contain" />
          ) : (
            <Icon name="Upload" size={20} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? 'Cambiar' : 'Subir'}
          </Button>
          {displayUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-error"
              onClick={() => {
                onRemove();
                if (inputRef.current) inputRef.current.value = '';
              }}
            >
              Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Config global de marca (nombre + logo_light/logo_dark/favicon) — POST /admin/branding.
 * Solo se renderiza detrás de admin.tenants.manage (ver ProfileView).
 */
export function PlatformBrandingSettings() {
  const queryClient = useQueryClient();
  const { data: branding } = useBranding();
  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [files, setFiles] = useState<Partial<Record<SlotKey, File>>>({});
  const [removedSlots, setRemovedSlots] = useState<Partial<Record<SlotKey, boolean>>>({});

  if (branding && !initialized) {
    setName(branding.name ?? '');
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (formData: FormData) => brandingService.update(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branding.public });
      notify.success('Branding actualizado');
      setFiles({});
      setRemovedSlots({});
    },
    onError: (error) => notify.error(extractApiError(error)),
  });

  const handleSelect = (slot: SlotKey) => (file: File) => {
    setFiles((prev) => ({ ...prev, [slot]: file }));
    setRemovedSlots((prev) => ({ ...prev, [slot]: false }));
  };

  const handleRemove = (slot: SlotKey) => () => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setRemovedSlots((prev) => ({ ...prev, [slot]: true }));
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append('name', name.trim());
    (['logo_light', 'logo_dark', 'favicon'] as SlotKey[]).forEach((slot) => {
      const file = files[slot];
      if (file) {
        formData.append(slot, file);
      } else if (removedSlots[slot]) {
        // Laravel `boolean` rule acepta '1'/'0', no el string literal 'true'/'false'
        formData.append(`remove_${slot}`, '1');
      }
    });
    updateMutation.mutate(formData);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">Branding de la plataforma</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nombre, logos y favicon usados en todo el sistema (login, sidebar, PDFs).
          </p>
        </div>

        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vende más"
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <ImageSlot
            label="Logo (fondo claro)"
            hint="Isotipo oscuro, para fondos claros"
            currentUrl={branding?.logo_light_url}
            file={files.logo_light ?? null}
            removed={!!removedSlots.logo_light}
            onSelect={handleSelect('logo_light')}
            onRemove={handleRemove('logo_light')}
          />
          <ImageSlot
            label="Logo (fondo oscuro)"
            hint="Isotipo claro, para fondos oscuros"
            currentUrl={branding?.logo_dark_url}
            file={files.logo_dark ?? null}
            removed={!!removedSlots.logo_dark}
            onSelect={handleSelect('logo_dark')}
            onRemove={handleRemove('logo_dark')}
          />
          <ImageSlot
            label="Favicon"
            hint="Ícono de pestaña del navegador"
            currentUrl={branding?.favicon_url}
            file={files.favicon ?? null}
            removed={!!removedSlots.favicon}
            onSelect={handleSelect('favicon')}
            onRemove={handleRemove('favicon')}
          />
        </div>

        <div className="flex justify-end">
          <Button color="primary" onClick={handleSave} disabled={updateMutation.isPending}>
            <Icon name="Save" size={16} className="mr-2" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
