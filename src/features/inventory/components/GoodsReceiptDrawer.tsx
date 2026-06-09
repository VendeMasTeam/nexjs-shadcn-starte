'use client';

import { useState } from 'react';
import { notify } from 'src/lib/notify';
import { useLocales } from 'src/locales/use-locales';
import {
  Button,
  DeleteButton,
  Icon,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'src/shared/components/ui';
import { Input } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { useProducts } from '../hooks/use-products';
import { useWarehouses } from '../hooks/use-warehouses';
import { inventoryStockService } from '../services/inventory-stock.service';
import type { InventoryMasterItem } from '../types/inventory.types';

interface ReceiptItem {
  product_uid: string;
  quantity: number;
}

interface GoodsReceiptDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GoodsReceiptDrawer({ open, onClose, onSuccess }: GoodsReceiptDrawerProps) {
  const [warehouseUid, setWarehouseUid] = useState('');
  const [warehouseLabel, setWarehouseLabel] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([{ product_uid: '', quantity: 1 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 400);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch, 400);
  // Cache full product object per item so label + stock preview survive search filtering
  const [itemCache, setItemCache] = useState<Record<number, InventoryMasterItem>>({});

  const { currentLang } = useLocales();

  const { items: products } = useProducts({
    search: debouncedProductSearch || undefined,
    per_page: 20,
  });

  const { items: warehouseItems } = useWarehouses({
    search: debouncedWarehouseSearch || undefined,
    per_page: 15,
  });
  const activeWarehouses = warehouseItems.filter((w) => w.is_active);

  const getWarehouseOptions = () => {
    const base = activeWarehouses.map((w) => ({ value: w.uid, label: w.name }));
    if (warehouseUid && warehouseLabel && !base.find((o) => o.value === warehouseUid)) {
      return [{ value: warehouseUid, label: warehouseLabel }, ...base];
    }
    return base;
  };

  const handleWarehouseSelect = (uid: string) => {
    const w = activeWarehouses.find((w) => w.uid === uid);
    if (w) setWarehouseLabel(w.name);
    setWarehouseSearch('');
    setWarehouseUid(uid);
  };

  const activeProducts = products.filter((p) => p.is_active);

  const addItem = () => setItems((prev) => [...prev, { product_uid: '', quantity: 1 }]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemCache((prev) => {
      const next: Record<number, InventoryMasterItem> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index) next[k] = val;
        else if (k > index) next[k - 1] = val;
      });
      return next;
    });
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`item-${index}-${field}`];
      delete next[`item-${index}-dup`];
      return next;
    });
  };

  const handleProductSelect = (index: number, uid: string) => {
    const product = activeProducts.find((p) => p.uid === uid);
    if (product) {
      setItemCache((prev) => ({ ...prev, [index]: product }));
    }
    setProductSearch('');
    updateItem(index, 'product_uid', uid);
  };

  // Always include the selected product in options so getLabel never falls back to uid
  // Disable products already selected in other items
  const getItemOptions = (index: number) => {
    const usedUids = new Set(
      items
        .filter((_, i) => i !== index)
        .map((i) => i.product_uid)
        .filter(Boolean)
    );
    const base = activeProducts.map((p) => ({
      value: p.uid,
      label: `${p.name} — ${p.sku}`,
      disabled: usedUids.has(p.uid),
    }));
    const cached = itemCache[index];
    const selectedUid = items[index]?.product_uid;
    if (cached && selectedUid && !base.find((o) => o.value === selectedUid)) {
      return [{ value: cached.uid, label: `${cached.name} — ${cached.sku}` }, ...base];
    }
    return base;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!warehouseUid) newErrors.warehouse = 'Selecciona una bodega';
    if (items.length === 0) newErrors.items = 'Agrega al menos un producto';
    items.forEach((item, i) => {
      if (!item.product_uid) newErrors[`item-${i}-product_uid`] = 'Selecciona un producto';
      if (!item.quantity || item.quantity < 1) newErrors[`item-${i}-quantity`] = 'Mínimo 1';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await Promise.all(
        items
          .filter((i) => i.product_uid)
          .map((i) =>
            inventoryStockService.adjust({
              product_uid: i.product_uid,
              warehouse_uid: warehouseUid,
              operation: 'in',
              quantity: i.quantity,
              comment:
                [orderRef ? `OC: ${orderRef}` : null, notes || null].filter(Boolean).join(' — ') ||
                undefined,
            })
          )
      );
      notify.success('Entrada registrada correctamente');
      onSuccess?.();
      handleClose();
    } catch {
      notify.error('Error al registrar la entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWarehouseUid('');
    setOrderRef('');
    setNotes('');
    setItems([{ product_uid: '', quantity: 1 }]);
    setErrors({});
    setProductSearch('');
    setWarehouseSearch('');
    setWarehouseLabel('');
    setItemCache({});
    onClose();
  };

  const filledItems = items.filter((i) => i.product_uid);
  const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const selectedWarehouse = warehouseUid ? { name: warehouseLabel } : undefined;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>Registrar entrada de mercancía</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Bodega de destino"
              required
              searchable
              onSearch={setWarehouseSearch}
              className="col-span-2"
              options={getWarehouseOptions()}
              value={warehouseUid}
              onChange={(v) => handleWarehouseSelect(v as string)}
              placeholder="Seleccionar bodega..."
              error={errors.warehouse}
            />
            <Input
              label="Nº orden de compra (opcional)"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="Ej: OC-2026-045"
              className="col-span-2"
            />
            <Input
              label="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Mercancía llegó con daño parcial"
              className="col-span-2"
            />
          </div>

          <div>
            <p className="text-subtitle2 font-semibold text-foreground mb-3">Productos recibidos</p>
            {errors.items && <p className="text-caption text-error mb-2">{errors.items}</p>}

            <div className="space-y-3">
              {items.map((item, index) => {
                const selectedProduct = item.product_uid ? itemCache[index] : undefined;
                const warehouseStock = selectedProduct?.stocks.find(
                  (s) => s.warehouse_uid === warehouseUid
                );
                const currentStock = warehouseStock?.available_stock ?? null;

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <SelectField
                          label="Producto"
                          searchable
                          onSearch={setProductSearch}
                          options={getItemOptions(index)}
                          value={item.product_uid}
                          onChange={(v) => handleProductSelect(index, v as string)}
                          placeholder="Seleccionar producto..."
                          error={errors[`item-${index}-product_uid`]}
                        />
                      </div>

                      <div className="w-28">
                        <Input
                          label="Cantidad"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          error={errors[`item-${index}-quantity`]}
                        />
                      </div>

                      {items.length > 1 && (
                        <div className="mt-1">
                          <DeleteButton onClick={() => removeItem(index)} />
                        </div>
                      )}
                    </div>

                    {selectedProduct && currentStock !== null && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                        <span className="break-all">
                          Stock actual:{' '}
                          <span className="text-foreground font-medium">
                            {currentStock.toLocaleString(currentLang.value)} uds
                          </span>
                        </span>
                        {warehouseUid && item.quantity >= 1 && (
                          <>
                            <Icon name="ArrowRight" size={12} className="text-success shrink-0" />
                            <span className="break-all">
                              Nuevo stock:{' '}
                              <span className="font-semibold text-success">
                                {(currentStock + item.quantity).toLocaleString(currentLang.value)}{' '}
                                uds
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-1.5 text-caption text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
            >
              <Icon name="Plus" size={14} />
              Agregar otro producto
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-border/60 px-4 py-3 bg-muted/20">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Resumen de entrada
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {selectedWarehouse && (
              <div className="flex items-center gap-1.5">
                <Icon name="Warehouse" size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">
                  {selectedWarehouse.name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Icon name="Package" size={14} className="text-muted-foreground shrink-0" />
              <span className="text-sm">
                <span className="font-semibold text-foreground">{filledItems.length}</span>
                <span className="text-muted-foreground"> producto(s)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="Layers" size={14} className="text-muted-foreground shrink-0" />
              <span className="text-sm">
                <span className="font-semibold text-foreground">{totalUnits}</span>
                <span className="text-muted-foreground"> unidades</span>
              </span>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 pt-3 px-4 pb-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={15} className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Icon name="PackagePlus" size={15} />
                Confirmar entrada
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
