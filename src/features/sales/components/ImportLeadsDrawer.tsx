'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { extractApiError } from 'src/lib/api-errors';
import axiosInstance, { endpoints } from 'src/lib/axios';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportLeadsDrawer({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const res = await axiosInstance.get(endpoints.sales.opportunitiesTemplate, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plantilla-leads.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar la plantilla');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axiosInstance.post(endpoints.sales.opportunitiesImport, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Leads importados correctamente');
      onImported();
      onClose();
    } catch (error) {
      toast.error(extractApiError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Importar leads</SheetTitle>
          <SheetDescription>
            Descarga la plantilla, llénala con tus leads y súbela.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 px-6 py-6 space-y-5">
          <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
            <Icon name="Download" size={16} className="mr-2" />
            Descargar plantilla Excel
          </Button>

          <div className="space-y-2">
            <p className="text-sm font-medium">Selecciona el archivo</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Importando...' : 'Subir e importar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
