'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { notify } from 'src/lib/notify';
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
import type { Partner, PartnerPayload, PartnerStatus, PartnerType } from '../types';

const TYPE_OPTIONS: { value: PartnerType; label: string }[] = [
  { value: 'distributor', label: 'Distribuidor' },
  { value: 'reseller', label: 'Reseller' },
  { value: 'ally', label: 'Aliado' },
];

const STATUS_OPTIONS: { value: PartnerStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'prospect', label: 'Prospecto' },
];

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  partner?: Partner | null;
  onClose: () => void;
  onCreate: (data: PartnerPayload) => Promise<boolean>;
  onUpdate: (uid: string, data: Partial<PartnerPayload>) => Promise<boolean>;
}

interface FormProps {
  partner?: Partner | null;
  isEdit: boolean;
  onClose: () => void;
  onCreate: (data: PartnerPayload) => Promise<boolean>;
  onUpdate: (uid: string, data: Partial<PartnerPayload>) => Promise<boolean>;
}

function PartnerForm({ partner, isEdit, onClose, onCreate, onUpdate }: FormProps) {
  const init = isEdit && partner;
  const [name, setName] = useState(init ? partner.name : '');
  const [type, setType] = useState<PartnerType>(init ? partner.type : 'distributor');
  const [status, setStatus] = useState<PartnerStatus>(init ? partner.status : 'active');
  const [region, setRegion] = useState(init ? partner.region : '');
  const [contactName, setContactName] = useState(init ? partner.contact_name : '');
  const [contactEmail, setContactEmail] = useState(init ? partner.contact_email : '');
  const [phone, setPhone] = useState(init ? partner.phone : '');
  const [notes, setNotes] = useState(init ? partner.notes : '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: typeOptions } = useQuery({
    queryKey: ['partners', 'types'],
    queryFn: async () => {
      return partnersService.partners.getTypes();
    },
    staleTime: 0,
  });

  const resolvedTypeOptions = (typeOptions?.length ?? 0) > 0 ? typeOptions! : TYPE_OPTIONS;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es requerido';
    if (!region.trim()) errs.region = 'La región es requerida';
    if (!contactName.trim()) errs.contactName = 'El nombre de contacto es requerido';
    if (!contactEmail.trim()) errs.contactEmail = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
      errs.contactEmail = 'Formato de email inválido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);

    const data: PartnerPayload = {
      name,
      type,
      status,
      region,
      contact_name: contactName,
      contact_email: contactEmail,
      phone: phone || undefined,
      notes: notes || undefined,
      joined_date: new Date().toISOString().split('T')[0],
    };

    if (isEdit && partner) {
      const ok = await onUpdate(partner.uid, data);
      if (ok) {
        notify.success('Partner actualizado');
        onClose();
      } else {
        notify.error('Error al actualizar el partner');
      }
    } else {
      const ok = await onCreate(data);
      if (ok) {
        notify.success('Partner creado');
        onClose();
      } else {
        notify.error('Error al crear el partner');
      }
    }

    setLoading(false);
  };

  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle>{isEdit ? 'Editar partner' : 'Nuevo partner'}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <Input
          label="Nombre"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: TechDistrib Latam"
          error={errors.name}
        />

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Tipo"
            required
            options={resolvedTypeOptions}
            value={type}
            onChange={(v) => setType(v as PartnerType)}
          />
          <SelectField
            label="Estado"
            required
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => setStatus(v as PartnerStatus)}
          />
        </div>

        <Input
          label="Región"
          required
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Ej: Bogotá, Colombia"
          error={errors.region}
        />

        <Input
          label="Nombre del contacto"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Nombre y apellido"
          error={errors.contactName}
        />

        <Input
          label="Email del contacto"
          required
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contacto@partner.com"
          error={errors.contactEmail}
        />

        <Input
          label="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+57 310 555 0000"
        />

        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Información adicional sobre el partner..."
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

export function PartnerDrawer({ open, mode, partner, onClose, onCreate, onUpdate }: Props) {
  const isEdit = mode === 'edit';
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <PartnerForm
          key={`${open}-${partner?.uid ?? 'new'}`}
          partner={partner}
          isEdit={isEdit}
          onClose={onClose}
          onCreate={onCreate}
          onUpdate={onUpdate}
        />
      </SheetContent>
    </Sheet>
  );
}
