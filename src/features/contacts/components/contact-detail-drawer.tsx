'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from 'src/shared/components/ui/sheet';

import { ActivitiesTab } from '../../productivity/components/ActivitiesTab';
import { InteractionsTimeline } from '../../productivity/components/InteractionsTimeline';
import { VaultTab } from '../../productivity/components/VaultTab';
import type { Contact } from '../types/contacts.types';
import { ContactDetailHeader } from './contact-detail-drawer/ContactDetailHeader';
import { ContactDetailInfo } from './contact-detail-drawer/ContactDetailInfo';
import { ContactDetailRelations } from './contact-detail-drawer/ContactDetailRelations';
import { ContactDetailTabs, type DetailTab } from './contact-detail-drawer/ContactDetailTabs';

interface ContactDetailDrawerProps {
  contacto: Contact | null;
  todos: Contact[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (c: Contact) => void;
  onAddRelacion: (aId: string, bId: string, role?: string) => Promise<void>;
  onRemoveRelacion: (aId: string, bId: string) => Promise<void>;
}

export const ContactDetailDrawer: React.FC<ContactDetailDrawerProps> = ({
  contacto,
  todos,
  isOpen,
  onClose,
  onEdit,
  onAddRelacion,
  onRemoveRelacion,
}) => {
  const [tab, setTab] = useState<DetailTab>('info');

  return (
    <Sheet open={isOpen && !!contacto} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-[520px] flex flex-col p-0"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">{contacto?.name ?? 'Detalle de contacto'}</SheetTitle>
        {/* Header */}
        {contacto && <ContactDetailHeader contacto={contacto} onClose={onClose} onEdit={onEdit} />}

        {/* Tabs */}
        <ContactDetailTabs
          selected={tab}
          onChange={setTab}
          relationshipsCount={contacto?.relations?.length ?? 0}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Tab: Info */}
          {tab === 'info' && contacto && <ContactDetailInfo contacto={contacto} />}

          {tab === 'historial' && contacto && (
            <div className="-mx-6 -my-5 h-[calc(100%+40px)]">
              <InteractionsTimeline contactoId={contacto.uid} />
            </div>
          )}

          {tab === 'actividades' && contacto && (
            <div className="-mx-6 -my-5 h-[calc(100%+40px)]">
              <ActivitiesTab
                contactoId={contacto.uid}
                contactoNombre={contacto.name}
                entityType={contacto.type === 'company' ? 'account' : 'contact'}
              />
            </div>
          )}

          {tab === 'archivos' && contacto && (
            <div className="-mx-6 -my-5 h-[calc(100%+40px)]">
              <VaultTab contactoId={contacto.uid} />
            </div>
          )}

          {/* Tab: Relaciones */}
          {tab === 'relaciones' && contacto && (
            <ContactDetailRelations
              contacto={contacto}
              todos={todos}
              onAddRelacion={onAddRelacion}
              onRemoveRelacion={onRemoveRelacion}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
