import React, { useState } from 'react';
import { notify } from 'src/lib/notify';
import { Button, Icon } from 'src/shared/components/ui';

import { ExportColumn, FieldSelector } from './FieldSelector';

interface ExportBarProps {
  columns?: ExportColumn[];
  onExportExcel: (fields: string[]) => void;
  onExportPdf: (fields: string[]) => void;
  loading: 'excel' | 'pdf' | null;
  hasData: boolean;
}

export function ExportBar({
  columns = [],
  onExportExcel,
  onExportPdf,
  loading,
  hasData,
}: ExportBarProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.id))
  );

  const toggleField = (id: string, checked: boolean) => {
    const next = new Set(selectedFields);
    if (checked) {
      next.add(id);
    } else {
      if (next.size === 1) {
        notify.error('Debes exportar al menos un campo.');
        return;
      }
      next.delete(id);
    }
    setSelectedFields(next);
  };

  const fieldsArray = Array.from(selectedFields);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between bg-muted/10 border border-border/50 rounded-xl px-4 py-3 gap-4 mb-6">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <span className="text-body2 text-muted-foreground font-medium">Campos a exportar:</span>
        <FieldSelector
          columns={columns}
          selectedFields={selectedFields}
          onToggleField={toggleField}
          disabled={!hasData || loading !== null}
          onApply={() => notify.success('Campos aplicados')}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto sm:justify-end">
        {!hasData && (
          <span className="text-caption text-muted-foreground mr-2 hidden sm:inline">
            No hay datos para exportar
          </span>
        )}
        <Button
          variant="outline"
          onClick={() => onExportExcel(fieldsArray)}
          disabled={!hasData || loading !== null}
          className="bg-card w-full md:w-auto"
        >
          {loading === 'excel' ? (
            <>
              <Icon name="Loader2" size={16} className="animate-spin" /> Generando...
            </>
          ) : (
            <>
              <Icon name="FileText" size={16} className="text-success" /> Exportar Excel
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => onExportPdf(fieldsArray)}
          disabled={!hasData || loading !== null}
          className="bg-card w-full md:w-auto"
        >
          {loading === 'pdf' ? (
            <>
              <Icon name="Loader2" size={16} className="animate-spin" /> Generando...
            </>
          ) : (
            <>
              <Icon name="FileText" size={16} className="text-error" /> Exportar PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
