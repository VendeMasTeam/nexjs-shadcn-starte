'use client';

import { useMemo, useState } from 'react';
import { formatDate } from 'src/lib/date';
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatsCard,
} from 'src/shared/components/layouts/page';
import { Button, Icon, Input, SelectField } from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';

import { MaterialCard } from '../components/MaterialCard';
import { MaterialUploadDrawer } from '../components/MaterialUploadDrawer';
import { usePartners } from '../hooks/usePartners';
import type { PortalMaterial } from '../types';
import { MATERIAL_TYPE_CONFIG } from '../types';

// ─── Main View ────────────────────────────────────────────────────────────────

export function PartnerPortalView() {
  const { materials, materialStats, materialPagination, createMaterial, updateMaterial, removeMaterial } =
    usePartners();

  const [filterType, setFilterType] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PortalMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortalMaterial | null>(null);

  // Only type filter remains client-side (backend doesn't support ?type= yet)
  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchType = filterType === 'all' || m.type === filterType;
      return matchType;
    });
  }, [materials, filterType]);

  const statsCards = [
    {
      title: 'Total materiales',
      value: materialStats.total,
      trend: 'disponibles para partners',
      trendUp: true,
      icon: <Icon name="FolderOpen" size={18} />,
      iconClassName: 'bg-primary/10 text-primary',
    },
    {
      title: 'Total descargas',
      value: materialStats.totalDownloads,
      trend: 'histórico acumulado',
      trendUp: true,
      icon: <Icon name="Download" size={18} />,
      iconClassName: 'bg-info/10 text-info',
    },
    {
      title: 'Última actualización',
      value: materialStats.lastUpdated !== '—' ? formatDate(materialStats.lastUpdated) : '—',
      trend: 'del portal',
      trendUp: true,
      icon: <Icon name="Clock" size={18} />,
      iconClassName: 'bg-secondary/10 text-secondary-foreground',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Portal de Partners"
        subtitle="Materiales de venta, capacitación y recursos para aliados comerciales"
        action={
          <Button color="primary" size="sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}>
            <Icon name="Upload" size={16} />
            Subir material
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconClassName={card.iconClassName}
            trend={card.trend}
            trendUp={card.trendUp}
          />
        ))}
      </div>

      {/* Content */}
      <SectionCard>
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por título o tags..."
              value={materialPagination.search ?? ''}
              onChange={(e) => materialPagination.onChangeSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={15} />}
            />
          </div>

          <SelectField
            label="Tipo"
            options={[
              { value: 'all', label: 'Todos los tipos' },
              ...Object.entries(MATERIAL_TYPE_CONFIG).map(([key, cfg]) => ({
                value: key,
                label: cfg.label,
              })),
            ]}
            value={filterType}
            onChange={(v) => setFilterType(v as string)}
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Icon name="FolderOpen" size={36} className="text-muted-foreground mb-3" />
            <p className="text-subtitle2 font-medium">Sin materiales</p>
            <p className="text-caption text-muted-foreground mt-1">
              No hay materiales que coincidan con los filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((material) => (
              <MaterialCard
                key={material.uid}
                material={material}
                onEdit={() => {
                  setEditTarget(material);
                  setDrawerOpen(true);
                }}
                onDelete={() => setDeleteTarget(material)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <MaterialUploadDrawer
        open={drawerOpen}
        material={editTarget}
        onClose={() => {
          setDrawerOpen(false);
          setEditTarget(null);
        }}
        onUpload={createMaterial}
        onUpdate={updateMaterial}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await removeMaterial(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar material?"
        description={
          <>
            Vas a eliminar <strong>{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
