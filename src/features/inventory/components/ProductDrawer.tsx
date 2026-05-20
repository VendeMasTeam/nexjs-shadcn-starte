'use client';

import { useEffect, useState } from 'react';
import { customFieldsService } from 'src/features/settings/services/custom-fields.service';
import {
  Button,
  Icon,
  Input,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
} from 'src/shared/components/ui';
import { CustomFieldsSection } from 'src/shared/components/ui/custom-fields-section';
import { useDebounce } from 'use-debounce';

import { useCategories } from '../hooks/use-categories';
import type { CreateProductPayload, InventoryMasterItem } from '../types/inventory.types';

export type ProductDrawerMode = 'create' | 'edit';

interface ProductDrawerProps {
  open: boolean;
  mode: ProductDrawerMode;
  product?: InventoryMasterItem | null;
  warehouses: { uid: string; name: string }[];
  onClose: () => void;
  onSave: (payload: CreateProductPayload) => Promise<{ uid: string } | void>;
}

export function ProductDrawer({
  open,
  mode,
  product,
  warehouses,
  onClose,
  onSave,
}: ProductDrawerProps) {
  const [categorySearch, setCategorySearch] = useState('');
  const [debouncedCategorySearch] = useDebounce(categorySearch, 400);
  const { categories } = useCategories({
    search: debouncedCategorySearch || undefined,
    per_page: 15,
  });
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryUid, setCategoryUid] = useState(product?.category_uid ?? '');
  const [reorderPoint, setReorderPoint] = useState(String(product?.reorder_point ?? 0));
  const [costPrice, setCostPrice] = useState(String(product?.unit_cost ?? ''));
  const [salePrice, setSalePrice] = useState(String(product?.sale_price ?? ''));
  const [discountPercent, setDiscountPercent] = useState(String(product?.discount_percent ?? ''));
  const [active, setActive] = useState(product ? product.is_active : true);
  const [warehouseStocks, setWarehouseStocks] = useState<
    { warehouse_uid: string; quantity: string }[]
  >([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setDescription(product?.description ?? '');
    setCategoryUid(product?.category_uid ?? '');
    setReorderPoint(String(product?.reorder_point ?? 0));
    setCostPrice(String(product?.unit_cost ?? ''));
    setSalePrice(String(product?.sale_price ?? ''));
    setDiscountPercent(String(product?.discount_percent ?? ''));
    setActive(product ? product.is_active : true);
    setWarehouseStocks([]);
    setErrors({});
    setCustomFieldValues(
      Object.fromEntries((product?.custom_fields ?? []).map((f) => [f.custom_field_uid, f.value]))
    );
  }, [open, product, warehouses]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'El nombre es requerido';
    if (!sku.trim()) next.sku = 'El SKU es requerido';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateProductPayload = {
        name,
        sku,
        description: description.trim() || undefined,
        category_uid: categoryUid || undefined,
        reorder_point: Number(reorderPoint),
        is_active: active,
        unit_cost: costPrice !== '' ? Number(costPrice) : undefined,
        sale_price: salePrice !== '' ? Number(salePrice) : undefined,
        discount_percent: discountPercent !== '' ? Number(discountPercent) : undefined,
      };
      if (mode === 'create') {
        payload.warehouse_stocks = warehouseStocks
          .filter((s) => Number(s.quantity) > 0)
          .map((s) => ({ warehouse_uid: s.warehouse_uid, quantity: Number(s.quantity) }));
      }
      const result = await onSave(payload);
      const entityUid = mode === 'edit' ? product?.uid : result?.uid;
      if (entityUid && Object.keys(customFieldValues).length > 0) {
        await customFieldsService.saveAll(entityUid, 'products', customFieldValues);
      }
      onClose();
    } catch {
      // error handled by MutationCache
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>{mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <Input
            label="Nombre del producto *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Camiseta Básica XL"
            error={errors.name}
          />
          <Input
            label="SKU / Código *"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ej: SKU-001-XL"
            error={errors.sku}
          />
          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional del producto"
            className="min-h-[60px] resize-none"
          />
          <SelectField
            label="Categoría"
            searchable
            onSearch={setCategorySearch}
            options={[
              { value: '', label: 'Sin categoría' },
              ...categories.map((c) => ({ value: c.uid, label: c.name })),
            ]}
            value={categoryUid}
            onChange={(v) => setCategoryUid(v as string)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Costo"
              type="number"
              min={0}
              step={0.01}
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Precio de venta"
              type="number"
              min={0}
              step={0.01}
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Descuento %"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="0"
            />
          </div>
          <Input
            label="Stock mínimo (umbral de alerta)"
            type="number"
            min={0}
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
          />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium leading-none">Estado</p>
              <p className="text-caption text-muted-foreground mt-0.5">
                {active ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {mode === 'create' && (
            <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
              <p className="text-subtitle2 text-foreground font-semibold">
                Stock inicial por bodega
              </p>
              <p className="text-caption text-muted-foreground">
                Opcional — agregá solo las bodegas con stock inicial.
              </p>

              {warehouseStocks.map((entry, index) => {
                const usedUids = new Set(warehouseStocks.map((s) => s.warehouse_uid));
                const availableOptions = warehouses.filter(
                  (w) => !usedUids.has(w.uid) || w.uid === entry.warehouse_uid
                );
                return (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      <SelectField
                        options={availableOptions.map((w) => ({ value: w.uid, label: w.name }))}
                        value={entry.warehouse_uid}
                        onChange={(v) =>
                          setWarehouseStocks((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, warehouse_uid: v as string } : s
                            )
                          )
                        }
                        placeholder="Bodega..."
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={0}
                        value={entry.quantity}
                        onChange={(e) =>
                          setWarehouseStocks((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, quantity: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Cant."
                      />
                    </div>
                    <button
                      onClick={() =>
                        setWarehouseStocks((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="mb-0.5 text-muted-foreground hover:text-error transition-colors p-1"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                );
              })}

              {warehouseStocks.length < warehouses.length && (
                <button
                  onClick={() =>
                    setWarehouseStocks((prev) => [...prev, { warehouse_uid: '', quantity: '0' }])
                  }
                  className="flex items-center gap-1.5 text-caption text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Icon name="Plus" size={14} />
                  Agregar bodega
                </button>
              )}
            </div>
          )}

          <CustomFieldsSection
            module="products"
            values={customFieldValues}
            onChange={setCustomFieldValues}
          />

          {mode === 'edit' && (
            <div
              className={
                active
                  ? 'rounded-xl border border-error/20 p-4 bg-error/5'
                  : 'rounded-xl border border-success/20 p-4 bg-success/5'
              }
            >
              <p
                className={
                  active
                    ? 'text-subtitle2 text-error font-medium mb-1'
                    : 'text-subtitle2 text-success font-medium mb-1'
                }
              >
                {active ? 'Inactivar producto' : 'Activar producto'}
              </p>
              <p className="text-caption text-muted-foreground mb-3">
                {active
                  ? 'El producto se ocultará de los flujos de venta.'
                  : 'El producto volverá a estar disponible en los flujos de venta.'}
              </p>
              <Button
                variant="outline"
                color={active ? 'error' : 'success'}
                size="sm"
                onClick={() => onSave({ name, sku, is_active: !active }).then(() => onClose())}
              >
                {active ? 'Inactivar producto' : 'Activar producto'}
              </Button>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={15} className="animate-spin" /> Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
