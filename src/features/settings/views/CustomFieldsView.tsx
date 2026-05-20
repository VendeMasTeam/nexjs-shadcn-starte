'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { queryKeys } from 'src/lib/query-keys';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { useDebounce } from 'use-debounce';

import { CustomFieldDrawer } from '../components/custom-fields/custom-field-drawer';
import { CustomFieldsTable } from '../components/custom-fields/custom-fields-table';
import { useCustomFields } from '../hooks/use-custom-fields';
import { customFieldsService } from '../services/custom-fields.service';
import type {
  CustomField,
  CustomFieldCreatePayload,
  CustomFieldModule,
} from '../types/settings.types';

// Fallback labels in case the API doesn't return modules yet
const FALLBACK_MODULE_LABELS: Record<string, string> = {
  contacts: 'Contactos',
  companies: 'Empresas',
  opportunities: 'Oportunidades',
  products: 'Productos',
};

const formatCount = (n: number | undefined) => {
  if (n === undefined) return null;
  return n > 999 ? '+999' : String(n);
};

export const CustomFieldsView = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);
  const [filterModule, setFilterModule] = useState<CustomFieldModule | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);

  const { fields, isLoading, createField, updateField, deleteField, pagination, moduleTotals } =
    useCustomFields({
      module: filterModule,
      search: debouncedSearch || undefined,
    });

  // Fetch available modules from backend (replaces hardcoded MODULES)
  const { data: modulesData } = useQuery({
    queryKey: queryKeys.settings.customFieldsModules,
    queryFn: () => customFieldsService.getModules(),
    staleTime: 0,
  });

  const availableModules: { key: CustomFieldModule; label: string }[] =
    (modulesData as { data?: { value: string; label: string }[] } | undefined)?.data?.map(
      (m: { value: string; label: string }) => ({
        key: m.value as CustomFieldModule,
        label: m.label,
      })
    ) ??
    Object.keys(FALLBACK_MODULE_LABELS).map((k) => ({
      key: k as CustomFieldModule,
      label: FALLBACK_MODULE_LABELS[k],
    }));

  // Totals from meta.totals — shows real counts from backend for all modules
  const totalAll = moduleTotals
    ? moduleTotals.contacts +
      moduleTotals.companies +
      moduleTotals.opportunities +
      moduleTotals.products
    : pagination.total;

  const handleOpenNew = () => {
    setSelectedField(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (field: CustomField) => {
    setSelectedField(field);
    setIsDrawerOpen(true);
  };

  const handleSave = async (data: CustomFieldCreatePayload) => {
    if (selectedField) return updateField(selectedField.uid, data);
    return createField(data);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Campos Personalizados"
        subtitle="Agrega campos a medida en los módulos del CRM según tu industria"
        action={
          <Button color="primary" onClick={handleOpenNew} className="gap-2">
            <Icon name="Plus" size={16} />
            Nuevo campo
          </Button>
        }
      />

      <SectionCard noPadding>
        {/* Search + filters inside card */}
        <div className="px-5 pt-4">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={16} />}
            className="max-w-sm"
          />
        </div>

        {/* Module filter tabs */}
        <div className="flex gap-1 border-b border-border/40">
          <button
            onClick={() => setFilterModule('ALL')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer ${
              filterModule === 'ALL'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                filterModule === 'ALL'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {formatCount(totalAll)}
            </span>
          </button>
          {availableModules.map((mod) => (
            <button
              key={mod.key}
              onClick={() => setFilterModule(mod.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer ${
                filterModule === mod.key
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mod.label}
              {moduleTotals && (
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    filterModule === mod.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {formatCount(moduleTotals[mod.key] ?? 0)}
                </span>
              )}
            </button>
          ))}
        </div>
        {isLoading && fields.length === 0 ? (
          <div className="p-8 flex flex-col gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-lg w-full" />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Icon name="Sliders" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No hay campos personalizados en este módulo.</p>
          </div>
        ) : (
          <CustomFieldsTable
            fields={fields}
            onEdit={handleEdit}
            onDelete={(f) => setDeleteTarget(f)}
            total={pagination.total}
            pageIndex={pagination.page - 1}
            pageSize={pagination.rowsPerPage}
            onPageChange={(pi) => pagination.onChangePage(pi + 1)}
            onPageSizeChange={pagination.onChangeRowsPerPage}
          />
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteField(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar campo?"
        description={
          <>
            Vas a eliminar <strong>{deleteTarget?.label ?? deleteTarget?.name}</strong>. Esta acción
            no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />

      <CustomFieldDrawer
        key={isDrawerOpen ? (selectedField?.uid ?? 'new') : 'closed'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        field={selectedField}
        onSave={handleSave}
      />
    </PageContainer>
  );
};
