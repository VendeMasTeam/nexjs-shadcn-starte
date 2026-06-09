'use client';

import { useEffect, useState } from 'react';
import { notify } from 'src/lib/notify';
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
  Textarea,
} from 'src/shared/components/ui';
import { Input } from 'src/shared/components/ui';
import { useDebounce } from 'use-debounce';

import { useProducts } from '../hooks/use-products';
import { inventoryStockService } from '../services/inventory-stock.service';
import type { InventoryMasterItem, Warehouse } from '../types/inventory.types';

interface StockAdjustmentDrawerProps {
  open: boolean;
  onClose: () => void;
  productUid?: string;
  product?: InventoryMasterItem;
  warehouses: Warehouse[];
  onSuccess?: () => void;
}

export function StockAdjustmentDrawer({
  open,
  onClose,
  productUid,
  product,
  warehouses,
  onSuccess,
}: StockAdjustmentDrawerProps) {
  const [selectedProductUid, setSelectedProductUid] = useState(productUid ?? '');
  const [warehouseUid, setWarehouseUid] = useState('');
  const [operation, setOperation] = useState<'in' | 'out' | 'set'>('in');
  const [quantity, setQuantity] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 400);

  const { items: searchedProducts } = useProducts({
    search: debouncedProductSearch || undefined,
    per_page: 15,
  });

  useEffect(() => {
    if (productUid) setSelectedProductUid(productUid);
  }, [productUid]);

  const selectedProduct = productUid
    ? product
    : searchedProducts.find((p) => p.uid === selectedProductUid);

  const currentWarehouseStock = selectedProduct?.stocks.find(
    (s) => s.warehouse_uid === warehouseUid
  );
  const qty = Number(quantity) || 0;
  const currentStock = currentWarehouseStock?.available_stock ?? 0;
  const newStock =
    operation === 'in' ? currentStock + qty : operation === 'out' ? currentStock - qty : qty;
  const wouldGoNegative = operation === 'out' && qty > currentStock;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedProductUid) newErrors.product = 'Selecciona un producto';
    if (!warehouseUid) newErrors.warehouse = 'Selecciona una bodega';
    if (operation === 'set') {
      if (quantity === '' || qty < 0) newErrors.quantity = 'Ingresa una cantidad válida (mínimo 0)';
    } else {
      if (!quantity || qty < 1) newErrors.quantity = 'Ingresa una cantidad válida (mínimo 1)';
      else if (wouldGoNegative)
        newErrors.quantity = `No puedes reducir más de lo disponible (${currentStock} uds)`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await inventoryStockService.adjust({
        product_uid: selectedProductUid,
        warehouse_uid: warehouseUid,
        operation,
        quantity: qty,
        comment: comment.trim() || undefined,
      });
      const label =
        operation === 'in' ? 'positivo' : operation === 'out' ? 'negativo' : 'de balance';
      notify.success(`Ajuste ${label} registrado`);
      onSuccess?.();
      handleClose();
    } catch {
      notify.error('Error al registrar el ajuste');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!productUid) setSelectedProductUid('');
    setWarehouseUid('');
    setOperation('in' as const);
    setQuantity('');
    setComment('');
    setErrors({});
    setProductSearch('');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>Ajuste de inventario</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {/* Producto */}
          {productUid && product ? (
            <div>
              <p className="text-sm font-medium mb-1.5">Producto</p>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 flex items-center gap-3">
                <Icon name="Package" size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-subtitle2 text-foreground font-medium">{product.name}</p>
                  <p className="text-caption text-muted-foreground font-mono">{product.sku}</p>
                </div>
              </div>
            </div>
          ) : (
            <SelectField
              label="Producto"
              required
              searchable
              onSearch={setProductSearch}
              options={searchedProducts
                .filter((p) => p.is_active)
                .map((p) => ({ value: p.uid, label: `${p.name} — ${p.sku}` }))}
              value={selectedProductUid}
              onChange={(v) => {
                setSelectedProductUid(v as string);
                setWarehouseUid('');
              }}
              placeholder="Seleccionar producto..."
              error={errors.product}
            />
          )}

          {/* Bodega */}
          <div>
            <SelectField
              label="Bodega"
              required
              options={warehouses
                .filter((w) => w.is_active)
                .map((w) => ({ value: w.uid, label: w.name }))}
              value={warehouseUid}
              onChange={(v) => setWarehouseUid(v as string)}
              placeholder="Seleccionar bodega..."
              error={errors.warehouse}
            />
            {currentWarehouseStock && (
              <p className="text-caption text-muted-foreground mt-1">
                Disponible:{' '}
                <span className="font-semibold text-foreground">{currentStock} uds</span>
              </p>
            )}
          </div>

          {/* Tipo de ajuste */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Tipo de ajuste <span className="text-destructive">*</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOperation('in')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-3 transition-all text-left',
                  operation === 'in'
                    ? 'border-success bg-success/5 text-success'
                    : 'border-border/60 text-muted-foreground hover:border-success/40'
                )}
              >
                <Icon name="Plus" size={16} />
                <div>
                  <p className="text-subtitle2 font-semibold text-xs">Aumentar</p>
                  <p className="text-caption text-[10px]">Añadir</p>
                </div>
              </button>
              <button
                onClick={() => setOperation('out')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-3 transition-all text-left',
                  operation === 'out'
                    ? 'border-warning bg-warning/5 text-warning'
                    : 'border-border/60 text-muted-foreground hover:border-warning/40'
                )}
              >
                <Icon name="Minus" size={16} />
                <div>
                  <p className="text-subtitle2 font-semibold text-xs">Reducir</p>
                  <p className="text-caption text-[10px]">Descontar</p>
                </div>
              </button>
              <button
                onClick={() => setOperation('set')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-3 transition-all text-left',
                  operation === 'set'
                    ? 'border-info bg-info/5 text-info'
                    : 'border-border/60 text-muted-foreground hover:border-info/40'
                )}
              >
                <Icon name="Target" size={16} />
                <div>
                  <p className="text-subtitle2 font-semibold text-xs">Fijar</p>
                  <p className="text-caption text-[10px]">Balance exacto</p>
                </div>
              </button>
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <Input
              label="Cantidad"
              required
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.quantity;
                  return n;
                });
              }}
              error={errors.quantity}
            />
            {selectedProduct &&
              warehouseUid &&
              (qty > 0 || operation === 'set') &&
              !wouldGoNegative && (
                <div
                  className={cn(
                    'rounded-lg px-3 py-2.5 mt-2 border',
                    operation === 'in'
                      ? 'bg-success/5 border-success/20'
                      : operation === 'out'
                        ? 'bg-warning/5 border-warning/20'
                        : 'bg-info/5 border-info/20'
                  )}
                >
                  <p className="text-caption text-muted-foreground">
                    Actual: <span className="font-semibold text-foreground">{currentStock}</span>
                    {' → '}Nuevo:{' '}
                    <span
                      className={cn(
                        'font-bold',
                        operation === 'in'
                          ? 'text-success'
                          : operation === 'out'
                            ? 'text-warning'
                            : 'text-info'
                      )}
                    >
                      {newStock}
                    </span>{' '}
                    uds
                  </p>
                </div>
              )}
          </div>

          {/* Notas */}
          <Textarea
            label="Notas (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Observaciones del ajuste..."
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
              'Confirmar ajuste'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
