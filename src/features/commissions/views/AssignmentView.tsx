'use client';

import React, { useState } from 'react';
import { AssignmentDrawer } from 'src/features/commissions/components/assignment/assignment-drawer';
import { AssignmentsTable } from 'src/features/commissions/components/assignment/assignments-table';
import { BulkAssignmentDrawer } from 'src/features/commissions/components/assignment/bulk-assignment-drawer';
import { useAssignment } from 'src/features/commissions/hooks/use-assignment';
import { usePlans } from 'src/features/commissions/hooks/use-plans';
import type { AssignmentForm } from 'src/features/commissions/schemas/assignment.schema';
import type { CommissionAssignment } from 'src/features/commissions/types/commissions.types';
import { PageContainer, PageHeader, SectionCard } from 'src/shared/components/layouts/page';
import { Button } from 'src/shared/components/ui/button';
import { ConfirmDialog } from 'src/shared/components/ui/confirm-dialog';
import { Icon } from 'src/shared/components/ui/icon';
import { Input } from 'src/shared/components/ui/input';
import { useDebounce } from 'use-debounce';

export const AssignmentView = () => {
  // States for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  const {
    assignments,
    isLoading: isAsigLoading,
    createAssignment,
    updateAssignment,
    pagination,
  } = useAssignment({
    search: debouncedSearchTerm || undefined,
  });

  // Búsqueda server-side de planes, compartida entre el drawer de alta individual
  // y el de carga masiva (los dos consumen el mismo `usePlans`).
  const [planSearch, setPlanSearch] = useState('');
  const [debouncedPlanSearch] = useDebounce(planSearch, 400);
  const { plans } = usePlans({ search: debouncedPlanSearch || undefined });

  const [selectedAsignacion, setSelectedAsignacion] = useState<CommissionAssignment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMasivaOpen, setIsMasivaOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<{ uid: string; newActive: boolean } | null>(
    null
  );

  const handleEdit = (asignacion: CommissionAssignment) => {
    setSelectedAsignacion(asignacion);
    setIsDrawerOpen(true);
  };

  const handleToggleStatus = (id: string, newActive: boolean) => {
    setToggleTarget({ uid: id, newActive });
  };

  const handleConfirmToggle = () => {
    if (toggleTarget) {
      updateAssignment(toggleTarget.uid, { active: toggleTarget.newActive });
      setToggleTarget(null);
    }
  };

  const handleSave = async (data: AssignmentForm): Promise<boolean> => {
    try {
      if (selectedAsignacion) {
        await updateAssignment(selectedAsignacion.uid, {
          commission_plan_uid: data.plan_uid,
          starts_at: data.starts_at,
          ends_at: data.ends_at || undefined,
        });
      } else {
        await createAssignment({
          user_uid: data.user_uid,
          commission_plan_uid: data.plan_uid,
          starts_at: data.starts_at,
          ends_at: data.ends_at || undefined,
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <PageContainer fluid className="pb-10 min-w-0 w-full space-y-6">
      <PageHeader
        title="Asignación de Planes"
        subtitle="Administra el plan de comisión activo de cada vendedor de tu equipo"
        action={
          <div className="flex items-center gap-2">
            <Button
              color="primary"
              onClick={() => {
                setSelectedAsignacion(null);
                setIsDrawerOpen(true);
              }}
            >
              <Icon name="Plus" size={16} />
              Nueva Asignación
            </Button>
            <Button variant="outline" color="primary" onClick={() => setIsMasivaOpen(true)}>
              <Icon name="Users" className="mr-2 h-4 w-4" />
              Asignación Masiva
            </Button>
          </div>
        }
      />

      <SectionCard noPadding>
        {/* Filtros Integrados */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 bg-muted/10">
          <div className="flex-1">
            <Input
              label="Buscar"
              placeholder="Buscar por vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Icon name="Search" size={16} />}
            />
          </div>
        </div>

        <AssignmentsTable
          asignaciones={assignments}
          isLoading={isAsigLoading}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          total={pagination.total}
          pageIndex={pagination.page - 1}
          pageSize={pagination.rowsPerPage}
          onPageChange={(pi: number) => pagination.onChangePage(pi + 1)}
          onPageSizeChange={pagination.onChangeRowsPerPage}
        />
      </SectionCard>

      <AssignmentDrawer
        key={isDrawerOpen ? (selectedAsignacion?.uid ?? 'new') : 'closed'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        asignacion={selectedAsignacion}
        planesDisponibles={plans}
        onPlanSearch={setPlanSearch}
        onSave={handleSave}
      />

      <BulkAssignmentDrawer
        isOpen={isMasivaOpen}
        onClose={() => setIsMasivaOpen(false)}
        planesDisponibles={plans}
        onPlanSearch={setPlanSearch}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
        title={toggleTarget?.newActive ? '¿Activar asignación?' : '¿Desactivar asignación?'}
        description={
          toggleTarget?.newActive
            ? 'El vendedor volverá a tener el plan activo.'
            : 'El vendedor quedará sin plan de comisión activo.'
        }
        confirmLabel={toggleTarget?.newActive ? 'Activar' : 'Desactivar'}
        variant={toggleTarget?.newActive ? 'default' : 'warning'}
      />
    </PageContainer>
  );
};
