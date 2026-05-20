'use client';

import React, { useMemo, useState } from 'react';
import { endpoints } from 'src/lib/axios';
import { downloadExport } from 'src/lib/export-service';
import { ExportDropdown } from 'src/shared/components/export/ExportDropdown';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';

import { ContactDetailDrawer } from '../components/contact-detail-drawer';
import { ContactDrawer } from '../components/contact-drawer';
import { ContactsTable } from '../components/contacts-table';
import { useContacts } from '../hooks/use-contacts';
import type { Contact, ContactPayload, ContactType } from '../types/contacts.types';

const TABS: { value: 'ALL' | ContactType; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'company', label: 'Empresas (B2B)' },
  { value: 'person', label: 'Personas (B2C)' },
  { value: 'government', label: 'Instituciones (B2G)' },
];

export const ContactsView = () => {
  const [tab, setTab] = useState<'ALL' | ContactType>('ALL');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const {
    contactos,
    isLoading,
    createContacto,
    updateContacto,
    addRelacion,
    removeRelacion,
    deleteContacto,
    pagination,
  } = useContacts({
    search: search || undefined,
    type: tab,
    status: filterStatus !== 'ALL' ? filterStatus : undefined,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState<Contact | null>(null);

  const empresas = useMemo(() => contactos.filter((c) => c.type === 'company'), [contactos]);

  const counts = useMemo(
    () => ({
      ALL: contactos.length,
      company: contactos.filter((c) => c.type === 'company').length,
      person: contactos.filter((c) => c.type === 'person').length,
      government: contactos.filter((c) => c.type === 'government').length,
    }),
    [contactos]
  );

  const handleOpenNew = () => {
    setSelectedContacto(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (c: Contact) => {
    setSelectedContacto(c);
    setIsDetailOpen(false);
    setIsDrawerOpen(true);
  };

  const handleViewDetail = (c: Contact) => {
    setSelectedContacto(c);
    setIsDetailOpen(true);
  };

  const handleSave = async (form: ContactPayload): Promise<{ uid: string } | boolean> => {
    if (selectedContacto) return updateContacto(selectedContacto.uid, form);
    return createContacto(form);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    await downloadExport({
      endpoint: endpoints.contactsExport,
      format,
      filters: {
        search,
        type: tab !== 'ALL' ? tab : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      },
      filename: `contactos.${format === 'excel' ? 'xlsx' : 'pdf'}`,
    });
  };

  // Sync selectedContacto with latest data after mutations
  const currentContacto = selectedContacto
    ? (contactos.find((c) => c.uid === selectedContacto.uid) ?? selectedContacto)
    : null;

  return (
    <PageContainer>
      <PageHeader
        title="Directorio CRM"
        subtitle="Gestiona empresas, personas e instituciones de tu base comercial"
        action={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <Button color="primary" onClick={handleOpenNew} className="gap-2 cursor-pointer">
              <Icon name="Plus" className="h-4 w-4" />
              Nuevo contacto
            </Button>
          </div>
        }
      />

      {/* Type tabs */}
      <div className="flex gap-1 border-b border-border/40">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer ${
              tab === value
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === value ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
              }`}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      <SectionCard noPadding>
        <div className="flex flex-col sm:flex-row gap-3 items-end px-5 py-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" className="h-4 w-4" />}
            className="flex-1 max-w-sm"
          />
          <SelectField
            label="Estado"
            options={[
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'active', label: 'Activo' },
              { value: 'prospect', label: 'Prospecto' },
              { value: 'inactive', label: 'Inactivo' },
            ]}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string)}
          />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-4 p-5 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 rounded-lg w-full" />
            ))}
          </div>
        ) : (
          <>
            <ContactsTable
              contactos={contactos}
              onEdit={handleEdit}
              onViewDetail={handleViewDetail}
              onDelete={(c) => deleteContacto(c.uid)}
              total={pagination.total}
              pageIndex={pagination.page - 1}
              pageSize={pagination.rowsPerPage}
              onPageChange={(pi) => pagination.onChangePage(pi + 1)}
              onPageSizeChange={pagination.onChangeRowsPerPage}
            />
            <div className="border-t border-border/40 p-4 text-sm text-muted-foreground">
              {contactos.length} contacto{contactos.length !== 1 ? 's' : ''}
              {tab !== 'ALL' && ` · ${TABS.find((t) => t.value === tab)?.label}`}
            </div>
          </>
        )}
      </SectionCard>

      <ContactDrawer
        key={isDrawerOpen ? (selectedContacto?.uid ?? 'new') : 'closed'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        contacto={selectedContacto}
        empresas={empresas}
        onSave={handleSave}
      />

      <ContactDetailDrawer
        contacto={currentContacto}
        todos={contactos}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEdit}
        onAddRelacion={addRelacion}
        onRemoveRelacion={removeRelacion}
      />
    </PageContainer>
  );
};
