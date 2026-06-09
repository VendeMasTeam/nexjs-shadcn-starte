'use client';

import { useState } from 'react';
import { notify } from 'src/lib/notify';
import {
  Button,
  Icon,
  SelectField,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from 'src/shared/components/ui';
import { Input } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { useProducts } from '../hooks/use-products';
import { useWarehouses } from '../hooks/use-warehouses';
import { inventoryStockService } from '../services/inventory-stock.service';
import type { InventoryMasterItem } from '../types/inventory.types';

interface TransferDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TransferDrawer({ open, onClose, onSuccess }: TransferDrawerProps) {
  const [productUid, setProductUid] = useState('');
  const [productCache, setProductCache] = useState<InventoryMasterItem | null>(null);
  const [fromWarehouseUid, setFromWarehouseUid] = useState('');
  const [fromWarehouseLabel, setFromWarehouseLabel] = useState('');
  const [toWarehouseUid, setToWarehouseUid] = useState('');
  const [toWarehouseLabel, setToWarehouseLabel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 400);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [debouncedWarehouseSearch] = useDebounce(warehouseSearch, 400);

  const { items: products } = useProducts({
    search: debouncedProductSearch || undefined,
    per_page: 15,
  });

  const { items: warehouseItems } = useWarehouses({
    search: debouncedWarehouseSearch || undefined,
    per_page: 15,
  });
  const activeWarehouses = warehouseItems.filter((w) => w.is_active);

  const getWarehouseOptions = (excludeUid?: string, cachedUid?: string, cachedLabel?: string) => {
    const base = activeWarehouses
      .filter((w) => w.uid !== excludeUid)
      .map((w) => {
        const stock = selectedProduct?.stocks.find((s) => s.warehouse_uid === w.uid);
        return {
          value: w.uid,
          label: `${w.name}${stock ? ` — ${stock.available_stock} disp.` : ''}`,
        };
      });
    if (cachedUid && cachedLabel && !base.find((o) => o.value === cachedUid)) {
      return [{ value: cachedUid, label: cachedLabel }, ...base];
    }
    return base;
  };

  const buildWarehouseLabel = (uid: string) => {
    const w = activeWarehouses.find((w) => w.uid === uid);
    if (!w) return '';
    const stock = selectedProduct?.stocks.find((s) => s.warehouse_uid === w.uid);
    return `${w.name}${stock ? ` — ${stock.available_stock} disp.` : ''}`;
  };

  const handleFromSelect = (uid: string) => {
    setFromWarehouseLabel(buildWarehouseLabel(uid));
    setWarehouseSearch('');
    setFromWarehouseUid(uid);
    if (toWarehouseUid === uid) setToWarehouseUid('');
  };

  const handleToSelect = (uid: string) => {
    setToWarehouseLabel(buildWarehouseLabel(uid));
    setWarehouseSearch('');
    setToWarehouseUid(uid);
  };

  const handleProductSelect = (uid: string) => {
    const product = products.find((p) => p.uid === uid);
    if (product) setProductCache(product);
    setProductSearch('');
    setProductUid(uid);
    setFromWarehouseUid('');
    setToWarehouseUid('');
  };

  const selectedProduct =
    productUid && productCache?.uid === productUid
      ? productCache
      : products.find((p) => p.uid === productUid);
  const fromStock = selectedProduct?.stocks.find((s) => s.warehouse_uid === fromWarehouseUid);
  const toStock = selectedProduct?.stocks.find((s) => s.warehouse_uid === toWarehouseUid);
  const qty = Number(quantity) || 0;
  const availableInOrigin = fromStock?.available_stock ?? 0;
  const wouldGoNegative = qty > availableInOrigin;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!productUid) newErrors.product = 'Selecciona un producto';
    if (!fromWarehouseUid) newErrors.from = 'Selecciona la bodega origen';
    if (!toWarehouseUid) newErrors.to = 'Selecciona la bodega destino';
    if (fromWarehouseUid && toWarehouseUid && fromWarehouseUid === toWarehouseUid)
      newErrors.to = 'Las bodegas deben ser distintas';
    if (!quantity || qty <= 0) newErrors.quantity = 'Ingresa una cantidad válida';
    else if (wouldGoNegative)
      newErrors.quantity = `Stock insuficiente (disponible: ${availableInOrigin} uds)`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await inventoryStockService.transfer({
        product_uid: productUid,
        from_warehouse_uid: fromWarehouseUid,
        to_warehouse_uid: toWarehouseUid,
        quantity: qty,
        comment: comment.trim() || undefined,
      });
      notify.success('Traslado registrado correctamente');
      onSuccess?.();
      handleClose();
    } catch {
      notify.error('Error al registrar el traslado');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProductUid('');
    setProductCache(null);
    setFromWarehouseUid('');
    setFromWarehouseLabel('');
    setToWarehouseUid('');
    setToWarehouseLabel('');
    setQuantity('');
    setComment('');
    setErrors({});
    setProductSearch('');
    setWarehouseSearch('');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>Registrar traslado</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <SelectField
            label="Producto"
            required
            searchable
            onSearch={setProductSearch}
            options={products
              .filter((p) => p.is_active)
              .map((p) => ({ value: p.uid, label: `${p.name} — ${p.sku}` }))}
            value={productUid}
            onChange={(v) => handleProductSelect(v as string)}
            placeholder="Seleccionar producto..."
            error={errors.product}
          />

          <SelectField
            label="Bodega origen"
            required
            searchable
            onSearch={setWarehouseSearch}
            options={getWarehouseOptions(toWarehouseUid, fromWarehouseUid, fromWarehouseLabel)}
            value={fromWarehouseUid}
            onChange={(v) => handleFromSelect(v as string)}
            placeholder="Seleccionar origen..."
            error={errors.from}
          />

          <SelectField
            label="Bodega destino"
            required
            searchable
            onSearch={setWarehouseSearch}
            options={getWarehouseOptions(fromWarehouseUid, toWarehouseUid, toWarehouseLabel)}
            value={toWarehouseUid}
            onChange={(v) => handleToSelect(v as string)}
            placeholder="Seleccionar destino..."
            error={errors.to}
          />

          <div>
            <Input
              label="Cantidad"
              required
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
            />
            {selectedProduct &&
              fromWarehouseUid &&
              toWarehouseUid &&
              qty > 0 &&
              !wouldGoNegative && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 mt-2">
                  <p className="text-caption text-muted-foreground">
                    Origen quedará con{' '}
                    <span className="font-semibold text-foreground">{availableInOrigin - qty}</span>{' '}
                    uds · Destino tendrá{' '}
                    <span className="font-semibold text-foreground">
                      {(toStock?.available_stock ?? 0) + qty}
                    </span>{' '}
                    uds
                  </p>
                </div>
              )}
          </div>

          <Textarea
            label="Comentario (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Ej: Reposición semanal..."
          />
        </div>

        <SheetFooter className="border-t border-border/60 pt-4 px-4 pb-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={15} className="animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar traslado'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
