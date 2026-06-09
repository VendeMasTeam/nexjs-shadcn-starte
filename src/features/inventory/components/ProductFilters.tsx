import { Icon, Input, SelectField } from 'src/shared/components/ui';

interface ProductFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  filterCategory: string;
  onFilterCategory: (v: string) => void;
  onCategorySearch?: (q: string) => void;
  filterStatus: string;
  onFilterStatus: (v: string) => void;
  filterWarehouse: string;
  onFilterWarehouse: (v: string) => void;
  onWarehouseSearch?: (q: string) => void;
  categories: { uid: string; name: string }[];
  warehouses: { uid: string; name: string }[];
}

export function ProductFilters({
  search,
  onSearch,
  filterCategory,
  onFilterCategory,
  onCategorySearch,
  filterStatus,
  onFilterStatus,
  filterWarehouse,
  onFilterWarehouse,
  onWarehouseSearch,
  categories,
  warehouses,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 px-5 py-4">
      <div className="w-full sm:flex-1 sm:min-w-48">
        <Input
          label="Buscar"
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          leftIcon={<Icon name="Search" size={15} />}
        />
      </div>
      <SelectField
        label="Categoría"
        searchable
        onSearch={onCategorySearch}
        options={[
          { value: 'all', label: 'Todas las categorías' },
          ...categories.map((c) => ({ value: c.uid, label: c.name })),
        ]}
        value={filterCategory}
        onChange={(v) => onFilterCategory(v as string)}
        className="w-full sm:w-auto"
      />
      <SelectField
        label="Estado"
        options={[
          { value: 'all', label: 'Todos los estados' },
          { value: 'normal', label: 'Disponible' },
          { value: 'low', label: 'Stock bajo' },
          { value: 'out', label: 'Sin stock' },
          { value: 'inactive', label: 'Inactivo' },
        ]}
        value={filterStatus}
        onChange={(v) => onFilterStatus(v as string)}
        className="w-full sm:w-auto"
      />
      <SelectField
        label="Bodega"
        searchable
        onSearch={onWarehouseSearch}
        options={[
          { value: 'all', label: 'Todas' },
          ...warehouses.map((w) => ({ value: w.uid, label: w.name })),
        ]}
        value={filterWarehouse}
        onChange={(v) => onFilterWarehouse(v as string)}
        className="w-full sm:w-auto"
      />
    </div>
  );
}
