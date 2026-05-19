'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from 'src/lib/utils';
import {
  Button,
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
import { inventoryStockService } from '../services/inventory-stock.service';
import type { Warehouse } from '../types/inventory.types';

interface ReceiptItem {
  product_uid: string;
  quantity: number;
}

interface GoodsReceiptDrawerProps {
  open: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onSuccess?: () => void;
}

export function GoodsReceiptDrawer({
  open,
  onClose,
  warehouses,
  onSuccess,
}: GoodsReceiptDrawerProps) {
  const [warehouseUid, setWarehouseUid] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([{ product_uid: '', quantity: 1 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 400);

  const { items: products } = useProducts({
    search: debouncedProductSearch || undefined,
    per_page: 20,
  });

  const activeProducts = products.filter((p) => p.is_active);

  const addItem = () => setItems((prev) => [...prev, { product_uid: '', quantity: 1 }]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`item-${index}-${field}`];
      delete next[`item-${index}-dup`];
      return next;
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!warehouseUid) newErrors.warehouse = 'Selecciona una bodega';
    if (items.length === 0) newErrors.items = 'Agrega al menos un producto';
    const seenProducts = new Set<string>();
    items.forEach((item, i) => {
      if (!item.product_uid) {
        newErrors[`item-${i}-product_uid`] = 'Selecciona un producto';
      } else if (seenProducts.has(item.product_uid)) {
        newErrors[`item-${i}-dup`] = 'Producto duplicado, ajusta la cantidad';
      } else {
        seenProducts.add(item.product_uid);
      }
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
      toast.success('Entrada registrada correctamente');
      onSuccess?.();
      handleClose();
    } catch {
      toast.error('Error al registrar la entrada');
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
    onClose();
  };

  const totalUnits = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>Registrar entrada de mercancía</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Bodega de destino *"
              required
              className="col-span-2"
              options={warehouses
                .filter((w) => w.is_active)
                .map((w) => ({ value: w.uid, label: w.name }))}
              value={warehouseUid}
              onChange={(v) => setWarehouseUid(v as string)}
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
                const selectedProduct = products.find((p) => p.uid === item.product_uid);
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
                          searchable
                          onSearch={setProductSearch}
                          options={activeProducts.map((p) => ({
                            value: p.uid,
                            label: `${p.name} — ${p.sku}`,
                          }))}
                          value={item.product_uid}
                          onChange={(v) => updateItem(index, 'product_uid', v as string)}
                          placeholder="Seleccionar producto..."
                          error={errors[`item-${index}-dup`] || errors[`item-${index}-product_uid`]}
                        />
                        {selectedProduct && currentStock !== null && (
                          <p className="text-caption text-muted-foreground">
                            Stock actual:{' '}
                            <span className="text-foreground font-medium">{currentStock} uds</span>
                          </p>
                        )}
                      </div>

                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          className={cn(errors[`item-${index}-quantity`] && 'border-error')}
                          placeholder="Cant."
                        />
                        {errors[`item-${index}-quantity`] && (
                          <p className="text-caption text-error">
                            {errors[`item-${index}-quantity`]}
                          </p>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="mt-1 text-muted-foreground hover:text-error transition-colors p-1"
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      )}
                    </div>

                    {selectedProduct &&
                      warehouseUid &&
                      item.quantity >= 1 &&
                      currentStock !== null && (
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <Icon name="ArrowRight" size={12} className="text-success" />
                          <span>
                            Nuevo stock:{' '}
                            <span className="font-semibold text-success">
                              {currentStock + item.quantity} uds
                            </span>
                          </span>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-1.5 text-caption text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Icon name="Plus" size={14} />
              Agregar otro producto
            </button>
          </div>
        </div>

        <div className="border-t border-border/60 px-4 pt-3 pb-1">
          <p className="text-caption text-muted-foreground">
            <span className="font-semibold text-foreground">
              {items.filter((i) => i.product_uid).length} producto(s)
            </span>{' '}
            · <span className="font-semibold text-foreground">{totalUnits} unidades totales</span>
          </p>
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
