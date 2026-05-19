'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { localizationService } from 'src/features/settings/services/localization.service';
import { usersService } from 'src/features/settings/services/users.service';
import {
  Button,
  Input,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';
import { Textarea } from 'src/shared/components/ui';

import { partnersService } from '../services/partners.service';
import type {
  Partner,
  PartnerOpportunity,
  PartnerOpportunityPayload,
  PartnerOpportunityStatus,
} from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  opportunity?: PartnerOpportunity | null;
  partners: Partner[];
  onClose: () => void;
  onCreate: (data: PartnerOpportunityPayload) => Promise<boolean>;
  onUpdate: (uid: string, data: Partial<PartnerOpportunityPayload>) => Promise<boolean>;
}

interface FormProps {
  opportunity?: PartnerOpportunity | null;
  partners: Partner[];
  isEdit: boolean;
  onClose: () => void;
  onCreate: (data: PartnerOpportunityPayload) => Promise<boolean>;
  onUpdate: (uid: string, data: Partial<PartnerOpportunityPayload>) => Promise<boolean>;
}

function OpportunityForm({
  opportunity,
  partners,
  isEdit,
  onClose,
  onCreate,
  onUpdate,
}: FormProps) {
  const init = isEdit && opportunity;
  const [partnerUid, setPartnerUid] = useState(init ? opportunity.partner_uid : '');
  const [clientName, setClientName] = useState(init ? opportunity.client_name : '');
  const [clientEmail, setClientEmail] = useState(init ? (opportunity.client_email ?? '') : '');
  const [product, setProduct] = useState(init ? opportunity.product : '');
  const [estimatedValue, setEstimatedValue] = useState(
    init ? String(opportunity.estimated_value) : ''
  );
  const [currency, setCurrency] = useState(init ? opportunity.currency : '');
  const [status, setStatus] = useState<PartnerOpportunityStatus>(
    init ? opportunity.status : 'pending'
  );
  const [assignedToInternal, setAssignedToInternal] = useState(
    init ? (opportunity.assigned_to_internal_uid ?? '') : ''
  );
  const [notes, setNotes] = useState(init ? (opportunity.notes ?? '') : '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: async () => {
      const res = await usersService.getAll({ per_page: 500 });
      return (
        ((res as Record<string, unknown>).data ?? []) as Array<{ uid: string; name: string }>
      ).map((u) => ({ value: u.uid, label: u.name }));
    },
    staleTime: 0,
  });

  const { data: statusOptionsData } = useQuery({
    queryKey: ['partners', 'opportunities', 'statuses'],
    queryFn: async () => {
      return partnersService.opportunities.getStatuses();
    },
    staleTime: 0,
  });

  const resolvedStatusOptions = statusOptionsData ?? [];

  // Currency options from backend
  const { data: currencyOptions = [] } = useQuery({
    queryKey: ['settings', 'localization', 'currencies'],
    queryFn: async () => {
      const res = (await localizationService.getOptions()) as Record<string, unknown>;
      const data = (res?.data ?? res) as { currencies?: Array<{ code: string; name: string }> };
      return (data.currencies ?? []).map((c: { code: string; name: string }) => ({
        value: c.code,
        label: `${c.code} — ${c.name}`,
      }));
    },
    staleTime: 0,
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!partnerUid) errs.partnerUid = 'Selecciona un partner';
    if (!clientName.trim()) errs.clientName = 'El nombre del cliente es requerido';
    if (!product.trim()) errs.product = 'El producto/servicio es requerido';
    if (!estimatedValue || Number(estimatedValue) <= 0)
      errs.estimatedValue = 'Ingresa un valor mayor a 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    const selectedPartner = partners.find((p) => p.uid === partnerUid);

    const data: PartnerOpportunityPayload = {
      partner_uid: partnerUid,
      partner_name: selectedPartner?.name ?? '',
      client_name: clientName,
      client_email: clientEmail || undefined,
      product,
      estimated_value: Number(estimatedValue),
      currency,
      status,
      registered_date: new Date().toISOString().split('T')[0],
      assigned_to_internal_uid: assignedToInternal || undefined,
      notes: notes || undefined,
    };

    if (isEdit && opportunity) {
      const ok = await onUpdate(opportunity.uid, data);
      if (ok) {
        onClose();
      }
    } else {
      const ok = await onCreate(data);
      if (ok) {
        onClose();
      }
    }

    setLoading(false);
  };

  const activePartners = partners.filter((p) => p.status === 'active');

  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle>{isEdit ? 'Editar oportunidad' : 'Registrar oportunidad'}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <SelectField
          label="Partner"
          required
          options={activePartners.map((p) => ({ value: p.uid, label: p.name }))}
          value={partnerUid}
          onChange={(v) => setPartnerUid(v as string)}
          placeholder="Selecciona un partner"
          error={errors.partnerUid}
        />

        <Input
          label="Nombre del cliente"
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Empresa o persona"
          error={errors.clientName}
        />

        <Input
          label="Email del cliente"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="contacto@cliente.com (opcional)"
        />

        <Input
          label="Producto / Servicio de interés"
          required
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Ej: Módulo CRM completo + inventario"
          error={errors.product}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor estimado"
            required
            type="number"
            min={0}
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="0"
            error={errors.estimatedValue}
          />
          <SelectField
            label="Moneda"
            options={currencyOptions}
            value={currency}
            onChange={(v) => setCurrency(v as string)}
          />
        </div>

        <SelectField
          label="Estado"
          options={resolvedStatusOptions}
          value={status}
          onChange={(v) => setStatus(v as PartnerOpportunityStatus)}
        />

        <SelectField
          label="Vendedor interno asignado"
          searchable
          options={[{ value: '', label: 'Sin asignar' }, ...userOptions]}
          value={assignedToInternal}
          onChange={(v) => setAssignedToInternal(v as string)}
        />

        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contexto adicional de la oportunidad..."
          rows={3}
        />
      </div>

      <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </SheetFooter>
    </>
  );
}

export function PartnerOpportunityDrawer({
  open,
  mode,
  opportunity,
  partners,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = mode === 'edit';
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <OpportunityForm
          key={`${open}-${opportunity?.uid ?? 'new'}`}
          opportunity={opportunity}
          partners={partners}
          isEdit={isEdit}
          onClose={onClose}
          onCreate={onCreate}
          onUpdate={onUpdate}
        />
      </SheetContent>
    </Sheet>
  );
}
