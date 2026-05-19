'use client';

import { useState } from 'react';
import { notify } from 'src/lib/notify';
import { cn } from 'src/lib/utils';
import { Button } from 'src/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/shared/components/ui/dropdown-menu';
import { Icon } from 'src/shared/components/ui/icon';

export interface ExportDropdownProps {
  onExport: (format: 'excel' | 'pdf') => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function ExportDropdown({ onExport, disabled = false, className }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setOpen(false);
    setLoading(true);
    try {
      await onExport(format);
    } catch (error) {
      notify.error((error as Error).message || 'Error al generar la descarga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className={cn('gap-2', className)}
        >
          {loading ? (
            <>
              <Icon name="Loader2" size={14} className="animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Icon name="Download" size={14} />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={loading}
          className="gap-2 cursor-pointer"
        >
          <Icon name="FileSpreadsheet" size={14} className="text-success" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={loading}
          className="gap-2 cursor-pointer"
        >
          <Icon name="FileType" size={14} className="text-error" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
