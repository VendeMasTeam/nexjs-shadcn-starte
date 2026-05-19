'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectsService } from 'src/features/projects/services/projects.service';
import { paths } from 'src/routes/paths';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui/sheet';

import type { Invoice } from '../types/sales.types';

interface ConvertToProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function ConvertToProjectDrawer({ open, onClose, invoice }: ConvertToProjectDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setName(`Proyecto - ${invoice.client_name ?? invoice.invoice_number}`);
      setStartDate(invoice.issued_at?.slice(0, 10) ?? today);
      setEndDate('');
    }
  }, [open, invoice, today]);

  // Check if a project already exists for this invoice
  const { data: existingProject, isLoading: checking } = useQuery({
    queryKey: ['project-by-invoice', invoice.uid],
    queryFn: () => projectsService.getByInvoice(invoice.uid),
    enabled: open,
    staleTime: 0,
  });

  const { mutate: convert, isPending } = useMutation({
    mutationFn: () =>
      projectsService.create({
        name: name.trim(),
        invoice_uid: invoice.uid,
        status: 'planning',
        start_date: startDate,
        end_date: endDate,
      }),
    onSuccess: (project) => {
      toast.success('Proyecto creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['project-by-invoice', invoice.uid] });
      onClose();
      router.push(paths.projects.detail(project.uid));
    },
    onError: () => toast.error('Error al crear el proyecto'),
  });

  const handleSubmit = () => {
    if (!name.trim() || !startDate || !endDate) return;
    convert();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[440px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon name="FolderKanban" size={18} />
            Convertir a Proyecto
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-5">
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Verificando…</p>
            </div>
          ) : existingProject ? (
            /* Already has a project */
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle2" size={16} className="text-emerald-500 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Ya existe un proyecto para esta factura
                </p>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{existingProject.name}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onClose();
                  router.push(paths.projects.detail(existingProject.uid));
                }}
              >
                <Icon name="ArrowRight" size={14} />
                Ver proyecto
              </Button>
            </div>
          ) : (
            /* Creation form */
            <>
              <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Factura origen
                </p>
                <p className="text-sm font-semibold text-foreground">{invoice.invoice_number}</p>
                {invoice.client_name && (
                  <p className="text-xs text-muted-foreground">{invoice.client_name}</p>
                )}
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  El backend vincula automáticamente cliente, oportunidad y cuenta.
                </p>
              </div>

              <Input
                label="Nombre del proyecto *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Implementación - Cliente X"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Fecha de inicio *"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="Fecha estimada de fin *"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </>
          )}
        </div>

        {!existingProject && !checking && (
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              color="primary"
              onClick={handleSubmit}
              disabled={!name.trim() || !startDate || !endDate || isPending}
            >
              {isPending ? (
                <Icon name="Loader2" size={14} className="animate-spin mr-1" />
              ) : (
                <Icon name="FolderKanban" size={14} className="mr-1" />
              )}
              Crear proyecto
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
