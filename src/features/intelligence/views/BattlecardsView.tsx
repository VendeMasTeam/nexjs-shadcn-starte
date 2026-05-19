'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageContainer, PageHeader, StatsCard } from 'src/shared/components/layouts/page';
import { Button, Icon, Input } from 'src/shared/components/ui';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { PaginationBar } from 'src/shared/components/ui/PaginationBar';

import { BattlecardCard } from '../components/BattlecardCard';
import { BattlecardDrawer } from '../components/BattlecardDrawer';
import { useIntelligence } from '../hooks/useIntelligence';
import type { Battlecard } from '../types';

export function BattlecardsView() {
  const {
    battlecards,
    stats,
    competitors,
    createBattlecard,
    updateBattlecard,
    deleteBattlecard,
    battlecardsPagination,
  } = useIntelligence();

  // TODO: tier filter — backend battlecards() acepta competitor_uid pero no filtra
  // por tier del competidor. Requiere join con competitors table en backend.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Battlecard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Battlecard | null>(null);

  const handleEdit = (bc: Battlecard) => {
    setEditing(bc);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditing(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Battlecards"
        subtitle={`${battlecards.length} competidores mapeados`}
        action={
          <div className="flex gap-2">
            <Link href="/intelligence/competitors">
              <Button variant="outline">
                <Icon name="Users" size={16} />
                Competidores
              </Button>
            </Link>
            <Button color="primary" onClick={() => setDrawerOpen(true)}>
              <Icon name="Plus" size={16} />
              Nueva battlecard
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Competidores"
          value={stats.total_competitors}
          icon={<Icon name="Target" size={18} />}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatsCard
          title="Win rate promedio"
          value={`${stats.avg_win_rate}%`}
          icon={<Icon name="TrendingUp" size={18} />}
          iconClassName="bg-success/10 text-success"
          trendUp={stats.avg_win_rate >= 50}
        />
        <StatsCard
          title="Mayor amenaza"
          value={stats.top_competitor}
          icon={<Icon name="Swords" size={18} />}
          iconClassName="bg-error/10 text-error"
        />
        <StatsCard
          title="Battlecards activas"
          value={battlecards.length}
          icon={<Icon name="FileText" size={18} />}
          iconClassName="bg-info/10 text-info"
        />
      </div>

      {/* Filters — search is server-side via battlecardsPagination */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <Input
            label="Buscar"
            placeholder="Buscar competidor..."
            value={battlecardsPagination.search ?? ''}
            onChange={(e) => battlecardsPagination.onChangeSearch(e.target.value)}
            leftIcon={<Icon name="Search" size={15} />}
          />
        </div>
      </div>

      {/* Grid de cards */}
      {battlecards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Icon name="Swords" size={26} className="text-muted-foreground" />
          </div>
          <p className="text-subtitle2 font-semibold text-foreground">Sin resultados</p>
          <p className="text-caption text-muted-foreground mt-1">
            Ajusta los filtros o crea una nueva battlecard.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {battlecards.map((bc) => (
              <BattlecardCard
                key={bc.uid}
                battlecard={bc}
                onEdit={handleEdit}
                onDelete={() => setDeleteTarget(bc)}
              />
            ))}
          </div>
          <PaginationBar
            page={battlecardsPagination.page}
            totalPages={Math.ceil(battlecardsPagination.total / battlecardsPagination.rowsPerPage)}
            onPageChange={battlecardsPagination.onChangePage}
          />
        </>
      )}

      <BattlecardDrawer
        open={drawerOpen}
        item={editing}
        competitors={competitors}
        onClose={handleClose}
        onCreate={createBattlecard}
        onUpdate={updateBattlecard}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteBattlecard(deleteTarget.uid);
          setDeleteTarget(null);
        }}
        title="¿Eliminar battlecard?"
        description={
          <>
            Vas a eliminar la battlecard de <strong>{deleteTarget?.competitor_name}</strong>. Esta
            acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        variant="error"
      />
    </PageContainer>
  );
}
