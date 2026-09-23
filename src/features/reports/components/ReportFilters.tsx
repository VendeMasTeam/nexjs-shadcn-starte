import React, { useState } from 'react';
import { useCategories } from 'src/features/inventory/hooks/use-categories';
import { useWarehouses } from 'src/features/inventory/hooks/use-warehouses';
import { cn } from 'src/lib/utils';
import { SectionCard } from 'src/shared/components/layouts/page';
import { Button, Icon, Input, SelectField } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import type { ReportFilterParams } from '../types';

interface ReportFiltersProps {
  onFiltersChange?: (filters: ReportFilterParams) => void;
}

export function ReportFilters({ onFiltersChange }: ReportFiltersProps) {
  const [expanded, setExpanded] = useState(true);
  const [period, setPeriod] = useState('Este mes');
  const [warehouse, setWarehouse] = useState('all');
  const [warehouseLabel, setWarehouseLabel] = useState('');
  const [category, setCategory] = useState('all');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Búsqueda server-side de bodegas/categorías (endpoints ya probados en
  // WarehousesView/ProductsView) — no dependemos de reportsService.getFilterOptions(),
  // que no soporta search ni paginación.
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch, 400);
  const [categorySearch, setCategorySearch] = useState('');
  const [debouncedCategorySearch] = useDebounce(categorySearch, 400);

  const { items: warehouseItems, isLoading: warehousesLoading } = useWarehouses({
    search: debouncedWarehouseSearch || undefined,
    per_page: 15,
  });
  const { categories: categoryItems, isLoading: categoriesLoading } = useCategories({
    search: debouncedCategorySearch || undefined,
    per_page: 15,
  });
  const filtersLoading = warehousesLoading || categoriesLoading;

  const getWarehouseOptions = () => {
    const base = warehouseItems.map((w) => ({ value: w.uid, label: w.name }));
    if (warehouse !== 'all' && warehouseLabel && !base.find((o) => o.value === warehouse)) {
      return [{ value: warehouse, label: warehouseLabel }, ...base];
    }
    return base;
  };

  const getCategoryOptions = () => {
    const base = categoryItems.map((c) => ({ value: c.uid, label: c.name }));
    if (category !== 'all' && categoryLabel && !base.find((o) => o.value === category)) {
      return [{ value: category, label: categoryLabel }, ...base];
    }
    return base;
  };

  const showCustomDate = period === 'Personalizado';
  const hasFilters = period !== 'Este mes' || warehouse !== 'all' || category !== 'all';

  const emitFilters = (p: string, w: string, c: string, sd: string, ed: string) => {
    if (onFiltersChange) {
      onFiltersChange({
        period: p,
        warehouse: w,
        category: c,
        ...(sd ? { start_date: sd } : {}),
        ...(ed ? { end_date: ed } : {}),
      });
    }
  };

  const handleClear = () => {
    setPeriod('Este mes');
    setWarehouse('all');
    setCategory('all');
    setStartDate('');
    setEndDate('');
    emitFilters('Este mes', 'all', 'all', '', '');
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    emitFilters(p, warehouse, category, startDate, endDate);
  };

  const handleWarehouseChange = (v: string) => {
    const w = warehouseItems.find((x) => x.uid === v);
    if (w) setWarehouseLabel(w.name);
    setWarehouseSearch('');
    setWarehouse(v);
    emitFilters(period, v, category, startDate, endDate);
  };

  const handleCategoryChange = (v: string) => {
    const c = categoryItems.find((x) => x.uid === v);
    if (c) setCategoryLabel(c.name);
    setCategorySearch('');
    setCategory(v);
    emitFilters(period, warehouse, v, startDate, endDate);
  };

  if (!expanded) {
    return (
      <div className="flex justify-end mt-4 lg:mt-0">
        <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
          <span className="mr-2">Mostrar filtros</span> <Icon name="ChevronDown" size={16} />
        </Button>
      </div>
    );
  }

  return (
    <SectionCard className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-1">
        <p className="text-subtitle2 font-bold text-foreground flex items-center gap-2">
          <Icon name="SlidersHorizontal" size={16} /> Filtros de reporte
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-error h-8 px-2"
            >
              <Icon name="RefreshCcw" size={14} className="mr-1.5" /> Limpiar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="h-8 w-8 p-0"
          >
            <Icon name="ChevronUp" size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Period */}
        <div className="md:col-span-6 flex flex-col gap-2">
          <p className="text-caption font-semibold text-muted-foreground">Período</p>
          <div className="flex flex-wrap items-center gap-2">
            {['Hoy', 'Esta semana', 'Este mes', 'Este trimestre', 'Personalizado'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={cn(
                  'px-3 py-1.5 text-caption font-semibold rounded-lg transition-colors border',
                  period === p
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/10 border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {p}
              </button>
            ))}
          </div>
          {showCustomDate && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1">
                <Input
                  type="date"
                  leftIcon={<Icon name="CalendarDays" size={14} />}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    emitFilters(period, warehouse, category, e.target.value, endDate);
                  }}
                />
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="flex-1">
                <Input
                  type="date"
                  leftIcon={<Icon name="CalendarDays" size={14} />}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    emitFilters(period, warehouse, category, startDate, e.target.value);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Warehouse */}
        <div className="md:col-span-3">
          <SelectField
            label="Bodega"
            searchable
            onSearch={setWarehouseSearch}
            disabled={filtersLoading}
            options={[{ value: 'all', label: 'Todas' }, ...getWarehouseOptions()]}
            value={warehouse}
            onChange={(v) => handleWarehouseChange(v as string)}
          />
        </div>

        {/* Category */}
        <div className="md:col-span-3">
          <SelectField
            label="Categoría"
            searchable
            onSearch={setCategorySearch}
            disabled={filtersLoading}
            options={[{ value: 'all', label: 'Todas las categorías' }, ...getCategoryOptions()]}
            value={category}
            onChange={(v) => handleCategoryChange(v as string)}
          />
        </div>
      </div>
    </SectionCard>
  );
}
