'use client';

import { useEffect, useState } from 'react';
import { useProducts } from 'src/features/inventory/hooks/use-products';
import { notify } from 'src/lib/notify';
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
import { useDebounce } from 'use-debounce';

import type { CatalogProduct, CreateCatalogProductPayload } from '../types/catalog.types';

interface CatalogProductDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  product?: CatalogProduct | null;
  onClose: () => void;
  onSave: (payload: CreateCatalogProductPayload) => Promise<void>;
}

const TYPE_OPTIONS = [
  { value: 'product', label: 'Producto físico' },
  { value: 'service', label: 'Servicio' },
];

export function CatalogProductDrawer({
  open,
  mode,
  product,
  onClose,
  onSave,
}: CatalogProductDrawerProps) {
  const [inventorySearch, setInventorySearch] = useState('');
  const [debouncedInventorySearch] = useDebounce(inventorySearch, 400);
  const { items: inventoryProducts } = useProducts({
    search: debouncedInventorySearch || undefined,
    per_page: 20,
  });

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [type, setType] = useState<'product' | 'service'>('product');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultDiscount, setDefaultDiscount] = useState('');
  const [inventoryProductUid, setInventoryProductUid] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setType(product?.type ?? 'product');
    setDescription(product?.description ?? '');
    setDefaultPrice(product?.default_price != null ? String(product.default_price) : '');
    setDefaultDiscount(
      product?.default_discount_percent != null ? String(product.default_discount_percent) : ''
    );
    setInventoryProductUid(product?.inventory_product_uid ?? '');
    setActive(product ? product.status === 'active' : true);
    setErrors({});
  }, [open, product]);

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
      const payload: CreateCatalogProductPayload = {
        name,
        sku,
        type,
        description: description.trim() || undefined,
        status: active ? 'active' : 'inactive',
        default_price: defaultPrice !== '' ? Number(defaultPrice) : undefined,
        default_discount_percent: defaultDiscount !== '' ? Number(defaultDiscount) : undefined,
        inventory_product_uid:
          type === 'product' && inventoryProductUid ? inventoryProductUid : undefined,
      };
      await onSave(payload);
      onClose();
    } catch {
      notify.error('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const inventoryOptions = [
    { value: '', label: 'Sin vincular' },
    ...(inventoryProducts ?? []).map((p) => ({
      value: p.uid,
      label: `${p.name} (${p.sku})`,
    })),
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>
            {mode === 'edit' ? 'Editar producto de catálogo' : 'Nuevo producto de catálogo'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <SelectField
            label="Tipo *"
            value={type}
            onChange={(v) => setType(v as 'product' | 'service')}
            options={TYPE_OPTIONS}
          />
          <Input
            label="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Consultoría de implementación"
            error={errors.name}
          />
          <Input
            label="SKU / Código *"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ej: SVC-IMPL-001"
            error={errors.sku}
          />
          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
            className="min-h-[60px] resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio por defecto"
              type="number"
              min={0}
              step={0.01}
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Descuento % por defecto"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={defaultDiscount}
              onChange={(e) => setDefaultDiscount(e.target.value)}
              placeholder="0"
            />
          </div>

          {type === 'product' && (
            <SelectField
              label="Producto de inventario vinculado"
              value={inventoryProductUid}
              onChange={(v) => {
                setInventoryProductUid(v as string);
                const inv = (inventoryProducts ?? []).find((p) => p.uid === v);
                if (inv) {
                  setName(inv.name);
                  setSku(inv.sku);
                  if (inv.sale_price != null) setDefaultPrice(String(inv.sale_price));
                  if (inv.discount_percent != null)
                    setDefaultDiscount(String(inv.discount_percent));
                }
              }}
              options={inventoryOptions}
              searchable
              onSearch={setInventorySearch}
              placeholder="Buscar producto de inventario..."
            />
          )}

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium leading-none">Estado</p>
              <p className="text-caption text-muted-foreground mt-0.5">
                {active ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
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
