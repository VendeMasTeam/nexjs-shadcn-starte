'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatMoney } from 'src/lib/currency';
import { PageContainer, PageHeader } from 'src/shared/components/layouts/page';
import { Badge } from 'src/shared/components/ui/badge';
import { Button } from 'src/shared/components/ui/button';
import { Card, CardContent } from 'src/shared/components/ui/card';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { useDebounce } from 'use-debounce';

import { CatalogProductDrawer } from '../components/CatalogProductDrawer';
import { catalogService } from '../services/catalog.service';
import type { CatalogProduct, CreateCatalogProductPayload } from '../types/catalog.types';

const TYPE_LABELS: Record<string, string> = {
  product: 'Producto',
  service: 'Servicio',
};

const TYPE_COLORS: Record<string, string> = {
  product: 'bg-blue-500/10 text-blue-600',
  service: 'bg-violet-500/10 text-violet-600',
};

export function CatalogView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 400);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogProduct | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['catalog', 'products', debouncedSearch],
    queryFn: () =>
      catalogService.getList(debouncedSearch ? { search: debouncedSearch } : undefined),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const handleSave = async (payload: CreateCatalogProductPayload) => {
    if (selected) {
      await catalogService.update(selected.uid, payload);
      toast.success('Producto actualizado');
    } else {
      await catalogService.create(payload);
      toast.success('Producto creado');
    }
    queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] });
  };

  const openCreate = () => {
    setSelected(null);
    setDrawerOpen(true);
  };

  const openEdit = (product: CatalogProduct) => {
    setSelected(product);
    setDrawerOpen(true);
  };

  const filtered = products;

  return (
    <PageContainer>
      <PageHeader
        title="Catálogo Comercial"
        subtitle="Productos y servicios disponibles para cotizar"
        action={
          <Button color="primary" onClick={openCreate}>
            <Icon name="Plus" size={16} />
            Nuevo producto
          </Button>
        }
      />

      <div className="mb-4 max-w-sm relative">
        <Icon
          name="Search"
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="BookOpen" size={36} className="text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">
              {search ? 'Sin resultados para esa búsqueda' : 'No hay productos en el catálogo'}
            </p>
            {!search && (
              <Button variant="outline" onClick={openCreate}>
                Agregar el primero
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <Card
              key={product.uid}
              className="border-none shadow-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEdit(product)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">{product.sku}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="soft"
                      className={`text-[10px] px-2 py-0.5 rounded-full border-none ${TYPE_COLORS[product.type]}`}
                    >
                      {TYPE_LABELS[product.type]}
                    </Badge>
                    <Badge
                      variant="soft"
                      className={`text-[10px] px-2 py-0.5 rounded-full border-none ${
                        product.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {product.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>

                {product.description && (
                  <p className="text-caption text-muted-foreground line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Precio base
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {product.default_price != null
                        ? formatMoney(product.default_price, { scope: 'tenant' })
                        : product.inventory_product?.sale_price != null
                          ? formatMoney(product.inventory_product.sale_price, { scope: 'tenant' })
                          : '—'}
                    </p>
                  </div>
                  {product.type === 'product' && product.inventory_product && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Stock disponible
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          product.inventory_product.stock_available_total > 0
                            ? 'text-emerald-600'
                            : 'text-red-500'
                        }`}
                      >
                        {product.inventory_product.stock_available_total}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CatalogProductDrawer
        open={drawerOpen}
        mode={selected ? 'edit' : 'create'}
        product={selected}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </PageContainer>
  );
}
