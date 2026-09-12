'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useIntelligence } from 'src/features/intelligence/hooks/useIntelligence';
import type { LostReasonInfo, WonInfo } from 'src/features/sales/types/sales.types';
import { paths } from 'src/routes/paths';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { SelectField } from 'src/shared/components/ui/select-field';
import { useLeadOrigins } from 'src/shared/hooks/useTenantOptions';

import { ImportLeadsDrawer } from '../components/ImportLeadsDrawer';
import {
  NewOpportunityDrawer,
  type NewOpportunityPayload,
} from '../components/NewOpportunityDrawer';
import { OpportunityPanel } from '../components/OpportunityPanel';
import { OutcomeDialog } from '../components/OutcomeDialog';
import { PipelineChevron } from '../components/PipelineChevron';
import { PipelineColumn } from '../components/PipelineColumn';
import { useSalesContext } from '../context/SalesContext';
import { useOpportunityPanel } from '../hooks/useOpportunityPanel';
import { usePipeline } from '../hooks/usePipeline';
import { opportunityService } from '../services/opportunity.service';

export function PipelineView() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ oppUid: string } | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);

  const {
    stages,
    opportunitiesByStage,
    scoredOpportunities,
    search,
    setSearch,
    origin,
    setOrigin,
    refresh,
  } = usePipeline();
  const {
    addOpportunity,
    moveOpportunity,
    reorderOpportunities,
    refreshOpportunities,
    opportunities,
  } = useSalesContext();
  const { competitors = [] } = useIntelligence();
  const leadOrigins = useLeadOrigins();
  const originOptions = [
    { value: '', label: 'Todos los orígenes' },
    ...(leadOrigins.data ?? []).map((o: { key: string; name: string }) => ({
      value: o.key,
      label: o.name,
    })),
  ];
  const { selectedId, isOpen, openPanel, closePanel, daysInStage, agingLevel, opportunity } =
    useOpportunityPanel(scoredOpportunities);

  const pendingOpportunity = pendingMove
    ? opportunities.find((o) => o.uid === pendingMove.oppUid)
    : undefined;

  const handleColumnDrop = (oppUid: string, targetStageUid: string) => {
    const targetStage = stages.find((s) => s.uid === targetStageUid);
    const isTerminal = targetStage?.is_won || targetStage?.is_lost;
    if (isTerminal) {
      setPendingMove({ oppUid });
      setOutcomeDialogOpen(true);
    } else {
      moveOpportunity(oppUid, targetStageUid);
    }
  };

  const handleOutcomeConfirm = async (
    outcome: 'ganado' | 'perdido',
    lostReason?: LostReasonInfo,
    wonInfo?: WonInfo
  ) => {
    if (!pendingMove) return;
    try {
      if (outcome === 'ganado') {
        await opportunityService.markWon(pendingMove.oppUid, wonInfo);
      } else {
        await opportunityService.markLost(pendingMove.oppUid, lostReason ? [lostReason] : []);
      }
      await refreshOpportunities();
    } catch {
      // error handled by toast in service layer
    }
    setOutcomeDialogOpen(false);
    setPendingMove(null);
  };

  const handleOutcomeCancel = () => {
    setOutcomeDialogOpen(false);
    setPendingMove(null);
  };

  const handleSaveOpportunity = async (
    data: NewOpportunityPayload
  ): Promise<{ uid: string } | void> => {
    const result = await addOpportunity(data);
    return { uid: result.uid };
  };

  return (
    <PageContainer fluid className="pb-10 min-w-0 w-full">
      <PageHeader
        title="Pipeline Comercial"
        subtitle="Gestiona y visualiza el avance de tus oportunidades de venta"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(paths.sales.pipelineHistory)}>
              <Icon name="History" size={16} />
              Ver historial
            </Button>
            <Button variant="outline" onClick={() => setImportDrawerOpen(true)}>
              <Icon name="Upload" size={16} />
              Importar
            </Button>
            <Button color="primary" onClick={() => setDrawerOpen(true)}>
              <Icon name="Plus" size={16} />
              Nueva Oportunidad
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <SectionCard className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <Input
              label="Buscar"
              placeholder="Buscar por cliente o contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Icon name="Search" size={16} />}
            />
          </div>
          <SelectField
            label="Origen"
            value={origin ?? ''}
            onChange={(v) => setOrigin((v as string) || undefined)}
            options={originOptions}
            className="w-full sm:w-48"
          />
        </div>
      </SectionCard>

      {/* Kanban */}
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar mt-2">
        <div
          className="flex flex-col w-full"
          style={{ minWidth: `${stages.length * 260 + (stages.length - 1) * 16}px` }}
        >
          <PipelineChevron stages={stages} />
          <div className="flex gap-4 w-full">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.uid}
                stage={stage}
                stages={stages}
                opportunities={opportunitiesByStage.get(stage.uid) ?? []}
                onCardDrop={handleColumnDrop}
                onOpenPanel={openPanel}
                onReorder={reorderOpportunities}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Drawer nueva oportunidad */}
      <NewOpportunityDrawer
        key={drawerOpen ? 'open' : 'closed'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveOpportunity}
        stages={stages}
      />

      {/* Panel lateral de oportunidad */}
      <OpportunityPanel
        opportunityId={selectedId}
        isOpen={isOpen}
        onClose={closePanel}
        daysInStage={daysInStage}
        agingLevel={agingLevel}
        stages={stages}
        opportunity={opportunity}
      />

      {/* Dialog de cierre */}
      <OutcomeDialog
        open={outcomeDialogOpen}
        clientName={pendingOpportunity?.title ?? ''}
        competitors={competitors}
        onConfirm={handleOutcomeConfirm}
        onCancel={handleOutcomeCancel}
      />

      {/* Importar leads */}
      <ImportLeadsDrawer
        open={importDrawerOpen}
        onClose={() => setImportDrawerOpen(false)}
        onImported={refresh}
      />
    </PageContainer>
  );
}
